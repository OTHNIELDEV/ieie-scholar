"""data/ieie_publications.csv → venues 테이블 시드"""
import csv, re
from pathlib import Path
from common import db, log

GROUP = {"conference_domestic": "conference_domestic", "conference_intl": "conference_intl", "journal": "journal", "journal_legacy": "journal_legacy", "magazine": "magazine", "education": "education", "report": "report"}
KNOWN = {"JSTS": ("jsts", ["SCIE", "SCOPUS", "KCI"]), "IEIE SPC": ("ieie-spc", ["SCOPUS", "KCI"]), "Journal of IEIE (Transactions)": ("j-ieie", ["KCI"])}


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s[:40] or "v"


def run():
    rows = list(csv.DictReader(open(Path(__file__).parent.parent / "data" / "ieie_publications.csv", encoding="utf-8")))
    seen = set()
    for r in rows:
        slug, idx = KNOWN.get(r["title_en"], (slugify(r["title_en"] or r["title_ko"]), None))
        while slug in seen:
            slug += "-x"
        seen.add(slug)
        db().table("venues").upsert({"slug": slug, "title_ko": r["title_ko"], "title_en": r["title_en"], "venue_type": GROUP[r["group"]],
                                     "active": r["status"] == "active", "indexing": idx, "description": r.get("note") or None}, on_conflict="slug").execute()
    log.info("seeded %d venues", len(rows))


if __name__ == "__main__":
    run()
