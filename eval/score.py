"""Score the engine and any chatbot outputs against eval/gold.json and write public/data/benchmark.json.

    py eval/score.py            # reads eval/outputs/*.json, writes public/data/benchmark.json and eval/report.md

Each outputs/<system>.json maps case id -> {"alerts": [{"type", "tier", "ingredients"}], "ms": optional}.
`type` is either one of the gold alert groups or a raw engine alert type (mapped through gold meta.alert_groups).
Only alerts a pharmacist would see (tier interrupt or inform) are scored; silent alerts are a log.
An alert is correct when its group equals an expected alert's group and they share an ingredient.
"""

from __future__ import annotations

import csv
import json
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DISPLAY = {"parchi": "Parchi engine", "chatgpt": "ChatGPT", "claude": "Claude", "gemini": "Gemini"}
SHOWN = {"interrupt", "inform"}


def alias_map() -> dict[str, str]:
    """Names a chatbot might use -> canonical ingredient id, from the curated Track A tables."""
    out: dict[str, str] = {}
    cur = ROOT / "data" / "curated"
    with open(cur / "ingredients.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            for name in [row["id"], row["name"], *row["aliases"].split("|")]:
                if name.strip():
                    out[name.strip().lower()] = row["id"]
    with open(cur / "ingredient_aliases.csv", encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            out[row["alias"].strip().lower()] = row["id"]
    return out


ALIASES = alias_map()


def canon(name: str) -> str:
    key = name.strip().lower().replace("_", " ")
    return ALIASES.get(key) or ALIASES.get(key.replace(" ", "")) or name.strip().lower().replace(" ", "_")


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def group_of(alert_type: str, groups: dict[str, list[str]]) -> str | None:
    if alert_type in groups:
        return alert_type
    for group, raw in groups.items():
        if alert_type in raw:
            return group
    return None


def matches(group: str, ingredients: set[str], expected: dict) -> bool:
    return expected["type"] == group and bool(ingredients & set(expected["ingredients"]))


def score_case(alerts: list[dict], expected: list[dict], groups: dict[str, list[str]]):
    """Returns (tp, fp, fn) as lists of (group, detail) and the shown alerts."""
    shown = [a for a in alerts if a.get("tier", "inform") in SHOWN]
    open_expected = list(expected)
    tp: list[tuple[str, str]] = []
    fp: list[tuple[str, str]] = []
    for a in shown:
        group = group_of(a["type"], groups)
        ings = {canon(i) for i in a.get("ingredients", [])}
        detail = f"{a['type']}:{'+'.join(sorted(ings)) or '-'}"
        if group is None:
            fp.append((a["type"], detail))
            continue
        hit = next((e for e in open_expected if matches(group, ings, e)), None)
        if hit is not None:
            open_expected.remove(hit)
            tp.append((group, detail))
        elif any(matches(group, ings, e) for e in expected):
            continue  # a second alert for something already caught: noise, but not a wrong alert
        else:
            fp.append((group, detail))
    fn = [(e["type"], f"{e['type']}:{'+'.join(e['ingredients'])}") for e in open_expected]
    return tp, fp, fn, shown


def kappa(gold_cases: list[dict], other: dict, groups: dict[str, list[str]]):
    """Cohen's kappa on 'is this alert group present in this case' between the gold set and a second rater."""
    a, b = [], []
    for case in gold_cases:
        if case["id"] not in other:
            continue
        have = {e["type"] for e in case["expected"]}
        theirs = {g for g in (group_of(x["type"], groups) for x in other[case["id"]]) if g}
        for g in groups:
            a.append(g in have)
            b.append(g in theirs)
    if not a:
        return None
    n = len(a)
    po = sum(x == y for x, y in zip(a, b)) / n
    pa, pb = sum(a) / n, sum(b) / n
    pe = pa * pb + (1 - pa) * (1 - pb)
    return None if pe == 1 else round((po - pe) / (1 - pe), 3)


def score_system(name: str, outputs: dict, gold: dict):
    groups = gold["meta"]["alert_groups"]
    cases = gold["cases"]
    tp = {g: 0 for g in groups}
    fp = {g: 0 for g in groups}
    fn = {g: 0 for g in groups}
    shown_counts, interrupt_counts, clean_alarms, clean_total = [], [], 0, 0
    misses, extras, ms = [], [], []
    for case in cases:
        out = outputs.get(case["id"])
        if out is None:
            continue
        t, f, n, shown = score_case(out["alerts"], case["expected"], groups)
        for g, _ in t:
            tp[g] += 1
        for g, d in f:
            if g in fp:
                fp[g] += 1
            extras.append(f"{case['id']}: {d}")
        for g, d in n:
            fn[g] += 1
            misses.append(f"{case['id']}: {d}")
        shown_counts.append(len(shown))
        interrupt_counts.append(sum(1 for a in shown if a.get("tier") == "interrupt"))
        if not case["expected"]:
            clean_total += 1
            clean_alarms += 1 if shown else 0
        if "ms" in out:
            ms.append(out["ms"])
    by_type = {}
    for g in groups:
        p = tp[g] / (tp[g] + fp[g]) if tp[g] + fp[g] else None
        r = tp[g] / (tp[g] + fn[g]) if tp[g] + fn[g] else None
        by_type[g] = {"precision": None if p is None else round(p, 3), "recall": None if r is None else round(r, 3)}
    n_scored = len(shown_counts)
    entry = {
        "name": DISPLAY.get(name, name.replace("_", " ").title()),
        "n_rx": n_scored,
        "alerts_per_rx": round(sum(shown_counts) / n_scored, 2) if n_scored else None,
        "interrupts_per_rx": round(sum(interrupt_counts) / n_scored, 2) if n_scored else None,
        "clean_fp_rate": round(clean_alarms / clean_total, 3) if clean_total else None,
        "by_type": by_type,
    }
    if ms:
        entry["median_ms"] = round(statistics.median(ms), 2)
    return entry, misses, extras


def main() -> int:
    gold = load(HERE / "gold.json")
    out_dir = HERE / "outputs"
    files = sorted(out_dir.glob("*.json")) if out_dir.exists() else []
    if not files:
        print("No outputs in eval/outputs/. Run `npm run eval:engine` first.", file=sys.stderr)
        return 1
    systems, report = [], ["# Benchmark report", "", f"Gold set: {len(gold['cases'])} cases. {gold['meta']['label_status']}", ""]
    for f in sorted(files, key=lambda p: (p.stem != "parchi", p.stem)):
        entry, misses, extras = score_system(f.stem, load(f), gold)
        systems.append(entry)
        report += [f"## {entry['name']}", "", f"alerts per Rx {entry['alerts_per_rx']}, interrupts per Rx {entry['interrupts_per_rx']}, false alarms on clean Rx {entry['clean_fp_rate']}", ""]
        report += ["Missed (expected, not raised):"] + [f"- {m}" for m in misses] + ([] if misses else ["- none"])
        report += ["", "Extra (raised, not expected):"] + [f"- {x}" for x in extras] + ([] if extras else ["- none"]) + [""]
    second = HERE / "second_rater.json"
    k = kappa(gold["cases"], load(second), gold["meta"]["alert_groups"]) if second.exists() else None
    bench = {
        "n_rx": len(gold["cases"]),
        "kappa": k,
        "label_status": gold["meta"]["label_status"],
        "systems": systems,
    }
    (ROOT / "public" / "data" / "benchmark.json").write_text(json.dumps(bench, indent=1) + "\n", encoding="utf-8")
    (HERE / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"Scored {len(systems)} system(s) on {len(gold['cases'])} cases -> public/data/benchmark.json, eval/report.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
