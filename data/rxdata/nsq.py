"""CDSCO monthly NSQ (not of standard quality) and spurious drug alerts.

Source: public JSON behind https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/
(cdscoonline.gov.in/CDSCO/filteredNsqDrugTable and filteredSpuriousDrugTable, by month).
The responses mix UTF-8 with stray Windows-1252 bytes (e.g. 0xAE for the registered sign).

The app matches a resolved brand to these rows by brand name; the pharmacist then checks the
batch number on the strip. A failed batch says nothing about other batches of the same brand.
"""
from __future__ import annotations

import codecs
import json
import re
from pathlib import Path

from .brands import display_name


def _cp1252_fallback(err: UnicodeDecodeError):
    return err.object[err.start:err.end].decode("cp1252", errors="replace"), err.end


codecs.register_error("cp1252fallback", _cp1252_fallback)

_NO_BRAND = re.compile(r"(?i)^\W*(na|n\.a\.?|n/a|nil|none|not (mentioned|available|known)|-+)?\W*$")


def clean_brand(raw: str | None) -> str | None:
    """"(Dianeal PD-2)," -> "Dianeal PD-2"; "Alzomac-0.5 Tablets" -> "Alzomac-0.5"; "NA" -> None."""
    t = re.sub(r"\s+", " ", (raw or "").replace("®", " ").replace("™", " ")).strip()
    t = t.strip(" ,;.'\"")
    if t.startswith("(") and t.endswith(")"):
        t = t[1:-1].strip()
    t = re.sub(r"\b\d+(?:\.\d+)?\s*ml\b", "", t, flags=re.I).strip()  # "Aqua P Mol 125 60 ml"
    if _NO_BRAND.match(t):
        return None
    return display_name(t) or None


def company(manufacturer: str) -> str:
    """Company name without the address: "Uniza Lifecare Pvt. Ltd.  , Sr. No. 919/7, ..." -> "Uniza Lifecare Pvt. Ltd."."""
    name = re.split(r"\s*,\s*", re.sub(r"\s+", " ", manufacturer or "").strip(), maxsplit=1)[0]
    return name.strip(" ,.") + ("." if name.endswith(".") else "")


def _clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def load_month_files(raw_dir: Path) -> list[dict]:
    out: list[dict] = []
    for path in sorted(raw_dir.glob("nsq_*.json")) + sorted(raw_dir.glob("spurious_*.json")):
        spurious = path.name.startswith("spurious_")
        doc = json.loads(path.read_bytes().decode("utf-8", errors="cp1252fallback"))
        for row in doc.get("aaData", []):
            product = _clean(row.get("str_product_name") or row.get("product_name_from_dtl"))
            entry = {
                "brand": clean_brand(row.get("str_brand_name")),
                "product": product,
                "batch": _clean(row.get("str_batch_no")),
                "mfg": _clean(row.get("dt_manufacturing_date")),
                "exp": _clean(row.get("dt_expiry_date")),
                "manufacturer": company(row.get("str_manufactured_by", "")),
                "result": _clean(row.get("str_nsq_result")),
                "reported_by": _clean(row.get("str_reported_by_lab_or_state")),
                "month": _clean(row.get("dt_reporting_month_year")).upper(),
                "spurious": spurious,
            }
            if spurious and row.get("str_nsq_remarks"):
                entry["remarks"] = _clean(row["str_nsq_remarks"])
            out.append(entry)
    order = {m: i for i, m in enumerate(["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"])}
    out.sort(key=lambda e: (e["month"][-4:], order.get(e["month"][:3], 99), e["brand"] or "~", e["batch"]), reverse=False)
    return out
