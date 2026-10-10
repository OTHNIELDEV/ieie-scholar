"""메타 완전성 점검 → quality_flags 갱신 + 리포트"""
from __future__ import annotations
from common import db, log

CHECKS = {
    "missing_title": lambda p: not (p.get("title_ko") or p.get("title_en")),
    "missing_abstract": lambda p: not (p.get("abstract_ko") or p.get("abstract_en")),
    "no_authors": lambda p: len(p.get("paper_authors") or []) == 0,
    "no_doi": lambda p: not p.get("doi"),
    "no_fulltext": lambda p: not p.get("fulltext_key"),
    "no_session": lambda p: p["venue"]["venue_type"].startswith("conference") and not p.get("session_id"),
    "no_summary": lambda p: not p.get("ai_summary_ready"),
}


def run():
    rows = db().table("papers").select("id,title_ko,title_en,abstract_ko,abstract_en,doi,fulltext_key,session_id,ai_summary_ready,quality_flags,venue:venues(venue_type),paper_authors(position)").limit(100000).execute().data
    totals = {k: 0 for k in CHECKS}
    for p in rows:
        flags = {k: True for k, f in CHECKS.items() if f(p)}
        for k in flags:
            totals[k] += 1
        db().table("papers").update({"quality_flags": {**(p.get("quality_flags") or {}), **{k: False for k in CHECKS}, **flags}}).eq("id", p["id"]).execute()
    n = len(rows) or 1
    for k, v in totals.items():
        log.info("%-18s %6d / %d  (%.1f%%)", k, v, n, 100 * v / n)


if __name__ == "__main__":
    run()
