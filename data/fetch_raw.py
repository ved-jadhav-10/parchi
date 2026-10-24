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
    "cdsco/fdc156_2024.pdf": "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadNewsFiles/List%20of%20Prohibited%20FDC%20drugs_%20156%20FDCs_%20dated%2002.08.2024.pdf",
    "cdsco/fdc16_2026.html": "https://medicaldialogues.in/news/industry/pharma/health-ministry-bans-16-fdcs-including-amoxicillin-serratiopeptidase-see-full-list-173339",
}
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
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            dest.write_bytes(r.read())
        print(f"got  {dest} ({dest.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
