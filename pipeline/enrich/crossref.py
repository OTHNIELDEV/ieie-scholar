"""Crossref: DOI 조회(서지 매칭) + 참고문헌 매칭 + cited-by"""
from __future__ import annotations
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from rapidfuzz import fuzz
from common import CFG, db, log

H = {"User-Agent": f"IEIE-Scholar/0.1 (mailto:{CFG['crossref']['mailto']})"}


@retry(stop=stop_after_attempt(4), wait=wait_exponential(min=1, max=20))
def _get(url, params=None):
    r = httpx.get(url, params=params, headers=H, timeout=30); r.raise_for_status(); return r.json()


def find_doi(title: str, first_author: str | None = None, year: int | None = None) -> str | None:
    if not title:
        return None
    params = {"query.bibliographic": title, "rows": 3}
    if first_author:
        params["query.author"] = first_author
    items = _get("https://api.crossref.org/works", params)["message"]["items"]
    for it in items:
        t = (it.get("title") or [""])[0]
        y = (it.get("issued", {}).get("date-parts") or [[None]])[0][0]
        if fuzz.ratio(t.lower(), title.lower()) >= 90 and (year is None or y is None or abs(int(y) - year) <= 1):
            return it["DOI"]
    return None


def match_references(paper_id: int):
    refs = db().table("references_raw").select("id,parsed").eq("paper_id", paper_id).is_("matched_doi", "null").execute().data
    for r in refs:
        p = r.get("parsed") or {}
        doi = p.get("doi") or find_doi(p.get("title"), (p.get("authors") or [None])[0], int(p["year"][:4]) if p.get("year") else None)
        if not doi:
            continue
        internal = db().table("papers").select("id").eq("doi", doi).limit(1).execute().data
        db().table("references_raw").update({"matched_doi": doi, "matched_paper_id": internal[0]["id"] if internal else None, "match_confidence": 0.9}).eq("id", r["id"]).execute()
        if internal:
            db().table("citations").upsert({"citing_paper_id": paper_id, "cited_paper_id": internal[0]["id"], "source": "internal"}).execute()


def register_doi_xml(paper: dict, prefix: str) -> str:
    """Crossref 등록용 XML 생성(요지). 실제 전송은 https://doi.crossref.org/servlet/deposit (회원 계정 필요)"""
    doi = f"{prefix}/ieie.{paper['id']}"
    return f"""<doi_batch xmlns="http://www.crossref.org/schema/5.3.1" version="5.3.1">
  <head><doi_batch_id>ieie-{paper['id']}</doi_batch_id><depositor><depositor_name>IEIE</depositor_name><email_address>{CFG['crossref']['mailto']}</email_address></depositor><registrant>IEIE</registrant></head>
  <body><conference><event_metadata><conference_name>{paper.get('venue_title','')}</conference_name></event_metadata>
  <conference_paper><titles><title>{paper.get('title_en') or paper.get('title_ko')}</title></titles>
  <doi_data><doi>{doi}</doi><resource>https://scholar.theieie.org/papers/{paper['id']}</resource></doi_data></conference_paper></conference></body></doi_batch>"""
