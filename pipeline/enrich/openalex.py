"""OpenAlex: 피인용·저자 ORCID·기관 ROR 보강"""
from __future__ import annotations
import os, httpx
from common import db, log

BASE = "https://api.openalex.org"
P = {"mailto": os.environ.get("OPENALEX_MAILTO", "")}


def work_by_doi(doi: str) -> dict | None:
    r = httpx.get(f"{BASE}/works/https://doi.org/{doi}", params=P, timeout=30)
    return r.json() if r.status_code == 200 else None


def sync_citations(paper_id: int, doi: str):
    w = work_by_doi(doi)
    if not w:
        return
    cnt = w.get("cited_by_count", 0)
    r = httpx.get(f"{BASE}/works", params={**P, "filter": f"cites:{w['id'].rsplit('/',1)[-1]}", "per-page": 200, "select": "doi,title"}, timeout=30)
    rows = []
    for c in r.json().get("results", []):
        cd = (c.get("doi") or "").replace("https://doi.org/", "")
        if not cd:
            continue
        internal = db().table("papers").select("id").eq("doi", cd).limit(1).execute().data
        rows.append({"citing_paper_id": internal[0]["id"] if internal else None, "cited_paper_id": paper_id, "citing_doi": cd, "source": "openalex"})
    rows = [x for x in rows if x["citing_paper_id"]]  # 외부 인용은 별도 테이블로 확장 가능
    if rows:
        db().table("citations").upsert(rows).execute()
    db().table("papers").update({"citation_count": cnt}).eq("id", paper_id).execute()
    log.info("openalex %s cited_by=%d", doi, cnt)
