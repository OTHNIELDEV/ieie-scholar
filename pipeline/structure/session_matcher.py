"""학술대회 프로그램(세션표 CSV) ↔ 논문 제목 fuzzy 매칭 → sessions / papers.session_id
CSV 컬럼: code,title,track,society_code,chair,room,start_at,end_at,type,paper_title
사용: python -m structure.session_matcher --issue 123 --csv program_2025_summer.csv
"""
from __future__ import annotations
import argparse, csv, re
from rapidfuzz import fuzz, process
from common import db, log


def norm(s: str) -> str:
    return re.sub(r"[\s\W_]+", "", (s or "").lower())


def run(issue_id: int, csv_path: str, threshold: int = 90):
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8")))
    soc = {s["code"]: s["id"] for s in db().table("societies").select("id,code").execute().data}
    sessions: dict[str, int] = {}
    for r in rows:
        if r["code"] in sessions:
            continue
        ins = db().table("sessions").upsert({
            "issue_id": issue_id, "code": r["code"], "title": r["title"], "track": r.get("track"), "society_id": soc.get(r.get("society_code")),
            "chair": r.get("chair"), "room": r.get("room"), "start_at": r.get("start_at") or None, "end_at": r.get("end_at") or None, "type": r.get("type") or None,
        }, on_conflict="issue_id,code").execute().data[0]
        sessions[r["code"]] = ins["id"]
    papers = db().table("papers").select("id,title_ko,title_en").eq("issue_id", issue_id).execute().data
    cands = {norm(p["title_ko"] or p["title_en"] or ""): p["id"] for p in papers}
    matched = unmatched = 0
    for r in rows:
        if not r.get("paper_title"):
            continue
        best = process.extractOne(norm(r["paper_title"]), list(cands.keys()), scorer=fuzz.ratio)
        if best and best[1] >= threshold:
            db().table("papers").update({"session_id": sessions[r["code"]]}).eq("id", cands[best[0]]).execute(); matched += 1
        else:
            unmatched += 1; log.warning("unmatched: %s (best %s)", r["paper_title"], best[1] if best else None)
    log.info("sessions=%d matched=%d unmatched=%d", len(sessions), matched, unmatched)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--issue", type=int, required=True); ap.add_argument("--csv", required=True); ap.add_argument("--threshold", type=int, default=90)
    a = ap.parse_args(); run(a.issue, a.csv, a.threshold)
