"""단계 1. PDF 수집 → R2 업로드, 중복 제거, papers 스텁 + ingest_jobs 생성
사용: python -m ingest.upload --venue conf-summer --year 2025 --dir ./raw/2025_summer [--meta meta.csv]
meta.csv (선택) 컬럼: file,title_ko,title_en,authors,session_code,page_start,page_end,award
"""
from __future__ import annotations
import argparse, csv
from pathlib import Path
import pdfplumber
from common import db, r2, CFG, sha256, log, set_stage


def is_scanned(pdf: Path) -> bool:
    try:
        with pdfplumber.open(pdf) as doc:
            txt = "".join((p.extract_text() or "") for p in doc.pages[:2])
        return len(txt.strip()) < 100
    except Exception:
        return True


def get_or_create_issue(venue_slug: str, year: int, title: str | None):
    v = db().table("venues").select("id").eq("slug", venue_slug).single().execute().data
    q = db().table("issues").select("id").eq("venue_id", v["id"]).eq("year", year).limit(1).execute().data
    if q:
        return v["id"], q[0]["id"]
    ins = db().table("issues").insert({"venue_id": v["id"], "year": year, "title": title}).execute().data[0]
    return v["id"], ins["id"]


def run(venue: str, year: int, dir_: Path, meta: Path | None, issue_title: str | None):
    venue_id, issue_id = get_or_create_issue(venue, year, issue_title)
    rows = {r["file"]: r for r in csv.DictReader(open(meta, encoding="utf-8"))} if meta else {}
    for pdf in sorted(dir_.glob("*.pdf")):
        digest = sha256(pdf)
        dup = db().table("papers").select("id").contains("legacy_ids", {"sha256": digest}).limit(1).execute().data
        if dup:
            log.info("skip dup %s", pdf.name); continue
        key = f"raw/{venue}/{year}/{pdf.name}"
        r2().upload_file(str(pdf), CFG["r2"]["bucket"], key, ExtraArgs={"ContentType": "application/pdf"})
        m = rows.get(pdf.name, {})
        paper = db().table("papers").insert({
            "venue_id": venue_id, "issue_id": issue_id, "fulltext_key": key,
            "fulltext_status": "scanned" if is_scanned(pdf) else "born_digital",
            "legacy_ids": {"sha256": digest, "source_file": pdf.name},
            "title_ko": m.get("title_ko") or None, "title_en": m.get("title_en") or None,
            "page_start": m.get("page_start") or None, "page_end": m.get("page_end") or None, "award": m.get("award") or None,
            "quality_flags": {"session_code": m.get("session_code")} if m.get("session_code") else {},
        }).execute().data[0]
        set_stage(paper["id"], "uploaded")
        log.info("uploaded %s -> paper %s", pdf.name, paper["id"])


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--venue", required=True); ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--dir", type=Path, required=True); ap.add_argument("--meta", type=Path); ap.add_argument("--issue-title")
    a = ap.parse_args(); run(a.venue, a.year, a.dir, a.meta, a.issue_title)
