"""Chatbot side of the benchmark: the same cases, asked of a general chatbot, scored by eval/score.py.

    py eval/chatbots.py prompts           # writes eval/prompts/<case>.txt and eval/prompts/all.txt (paste into ChatGPT / Gemini / Claude)
    py eval/chatbots.py claude            # asks Claude through the API (needs ANTHROPIC_API_KEY; optional EVAL_MODEL)

For a chatbot you paste by hand: ask each case in a fresh chat, save the JSON it answers with as
eval/outputs/<name>.json in the form {"S01": {"alerts": [...]}, ...} (chatgpt.json, gemini.json, ...).
Nothing here is fabricated: a system only appears in the benchmark when its output file exists.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
GOLD = json.loads((HERE / "gold.json").read_text(encoding="utf-8"))
GROUPS = list(GOLD["meta"]["alert_groups"])

INSTRUCTIONS = f"""You are helping a pharmacist who is verifying a prescription before dispensing in India.
List only the problems the pharmacist should see before dispensing. Do not list general advice.
Answer with JSON only, no other text, in exactly this form:
{{"alerts": [{{"type": "<one of: {', '.join(GROUPS)}>", "tier": "interrupt" or "inform", "ingredients": ["<generic names, lowercase>"]}}]}}
Use "interrupt" for a problem that should stop the order until resolved, "inform" for a note. Use {{"alerts": []}} if there is nothing to flag.
Type meanings: dose_excess = daily total above the usual maximum; duplicate_ingredient = same ingredient in two brands;
class_duplication = two drugs of the same class; ddi = drug-drug interaction; renal = unsuitable for this kidney function;
geriatric = unsuitable for this age; banned_fdc = fixed-dose combination banned by India's CDSCO; input_needed = a weight or creatinine
is missing and needed to check; schedule_mismatch = a weekly drug written as daily."""


def describe(case: dict) -> str:
    p = case["patient"]
    who = f"Patient: {p['age_years']} years" + "".join(
        f", {label} {p[k]}" for k, label in (("sex", "sex"), ("weight_kg", "weight kg"), ("serum_creatinine", "serum creatinine mg/dL")) if k in p
    )
    if case["kind"] == "single":
        return f"{who}\nPrescription (Indian brand names): {case['rx']}"
    rx = "\n".join(f"- {r['date']}, {r['doctor']}: {r['text']}" for r in case["prescriptions"])
    labs = "\n".join(f"- {x['type'].replace('_', ' ')} {x['value']} on {x['date']}" for x in case.get("labs", []))
    return f"{who}\nPrescriptions from different doctors. A medicine counts as taken from its date for the days written; with no days written assume 30:\n{rx}" + (f"\nLab results:\n{labs}" if labs else "")


def prompt_for(case: dict) -> str:
    return f"{INSTRUCTIONS}\n\n{describe(case)}"


def extract_json(text: str) -> dict:
    """The first JSON object in a model reply (models sometimes wrap it in a code fence or add a sentence)."""
    start = text.find("{")
    if start < 0:
        raise ValueError("no JSON in reply")
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        c = text[i]
        if in_str:
            esc = (c == "\\") and not esc
            if c == '"' and not esc:
                in_str = False
            elif c != "\\":
                esc = False
            continue
        if c == '"':
            in_str = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("unterminated JSON in reply")


def write_prompts() -> None:
    out = HERE / "prompts"
    out.mkdir(exist_ok=True)
    for case in GOLD["cases"]:
        (out / f"{case['id']}.txt").write_text(prompt_for(case) + "\n", encoding="utf-8")
    (out / "all.txt").write_text("\n\n=====\n\n".join(f"[{c['id']}]\n{prompt_for(c)}" for c in GOLD["cases"]) + "\n", encoding="utf-8")
    print(f"Wrote {len(GOLD['cases'])} prompts to eval/prompts/")


def ask_claude() -> None:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        sys.exit("Set ANTHROPIC_API_KEY first (it stays in your shell; nothing is written to disk).")
    model = os.environ.get("EVAL_MODEL", "claude-sonnet-5-5")
    results: dict[str, dict] = {}
    for case in GOLD["cases"]:
        body = json.dumps({"model": model, "max_tokens": 1024, "messages": [{"role": "user", "content": prompt_for(case)}]}).encode()
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
        )
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, timeout=120) as resp:
            reply = json.loads(resp.read())
        ms = round((time.perf_counter() - t0) * 1000)
        text = "".join(b.get("text", "") for b in reply["content"])
        try:
            alerts = extract_json(text).get("alerts", [])
        except ValueError:
            alerts = []
            print(f"{case['id']}: reply was not JSON, scored as no alerts", file=sys.stderr)
        results[case["id"]] = {"alerts": alerts, "ms": ms}
        print(case["id"], len(alerts), "alerts")
    (HERE / "outputs").mkdir(exist_ok=True)
    (HERE / "outputs" / "claude.json").write_text(json.dumps(results, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote eval/outputs/claude.json (model {model})")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "prompts":
        write_prompts()
    elif cmd == "claude":
        ask_claude()
    else:
        sys.exit(__doc__)
