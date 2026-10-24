"""Download the raw sources into data/raw/ (gitignored). Needed only to rebuild public/data/.

    python data/fetch_raw.py

The committed JSON in public/data/ already contains everything the app needs; a fresh clone
does not have to run this.
"""
from __future__ import annotations

import subprocess
import sys
import urllib.request
from pathlib import Path

RAW = Path(__file__).resolve().parent / "raw"

GIT_SOURCES = {
    # MIT licence; scraped from 1mg (prices Nov 2022). Brand names and compositions.
    "junioralive": "https://github.com/junioralive/Indian-Medicine-Dataset.git",
}
FILES = {
    # DDInter (CC BY-NC-SA 4.0): bulk files exist only for these ATC groups (no C, J, M, N).
    **{
        f"ddinter/ddinter_downloads_code_{c}.csv": f"https://ddinter.scbdd.com/static/media/download/ddinter_downloads_code_{c}.csv"
        for c in "ABDHLPRV"
    },
    "cdsco/fdc156_2024.pdf": "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadNewsFiles/List%20of%20Prohibited%20FDC%20drugs_%20156%20FDCs_%20dated%2002.08.2024.pdf",
    "cdsco/fdc16_2026.html": "https://medicaldialogues.in/news/industry/pharma/health-ministry-bans-16-fdcs-including-amoxicillin-serratiopeptidase-see-full-list-173339",
}
# CDSCO monthly NSQ (not of standard quality) and spurious drug lists, public JSON behind
# https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/ . Month format "SEP-2026".
NSQ_BASE = "https://cdscoonline.gov.in/CDSCO"
NSQ_MONTHS = ["APR-2026", "MAY-2026", "JUN-2026", "JUL-2026", "AUG-2026", "SEP-2026"]
for _m in NSQ_MONTHS:
    FILES[f"cdsco/nsq_{_m}.json"] = f"{NSQ_BASE}/filteredNsqDrugTable?month={_m}&source=All&tab=nsq"
    FILES[f"cdsco/spurious_{_m}.json"] = f"{NSQ_BASE}/filteredSpuriousDrugTable?month={_m}&source=All&tab=spurious"
# Jan Aushadhi (PMBJP) product list, PIB annexure to a Lok Sabha reply (drug code, generic name, unit size).
FILES["janaushadhi/pmbjp_list_2025-12-31.pdf"] = "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781701.pdf"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def main() -> int:
    RAW.mkdir(exist_ok=True)
    for name, url in GIT_SOURCES.items():
        dest = RAW / name
        if dest.exists():
            print(f"have {dest}")
            continue
        subprocess.run(["git", "clone", "--depth", "1", url, str(dest)], check=True)
    for rel, url in FILES.items():
        dest = RAW / rel
        if dest.exists():
            print(f"have {dest}")
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": f"{NSQ_BASE}/viewPublicNSQDrug"})
        with urllib.request.urlopen(req, timeout=60) as r:
            dest.write_bytes(r.read())
        print(f"got  {dest} ({dest.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
