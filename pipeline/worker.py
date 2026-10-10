"""메인 워커: ingest_jobs 를 stage 순으로 처리
uploaded → parsed(GROBID/OCR/Claude 보정) → extracted(figures) → embedded(chunks) → enriched(DOI/refs) → indexed(Typesense)
사용: python worker.py [--once] [--stage parsed]
"""
from __future__ import annotations
import argparse, time, io
from common import db, r2, CFG, log, set_stage
from parse import grobid_client, claude_header_fix, ocr
from extract import figures
from embed import chunker, voyage
from enrich import crossref
from index import typesense_sync

NEXT = {"uploaded": "parsed", "parsed": "extracted", "extracted": "embedded", "embedded": "enriched", "enriched": "indexed"}


def fetch_pdf(key: str) -> bytes:
    buf = io.BytesIO(); r2().download_fileobj(CFG["r2"]["bucket"], key, buf); return buf.getvalue()


def do_parse(p: dict, pdf: bytes):
    if p["fulltext_status"] == "scanned":
        pdf = ocr.make_searchable(pdf)
        r2().upload_fileobj(io.BytesIO(pdf), CFG["r2"]["bucket"], p["fulltext_key"].replace("raw/", "ocr/"))
    g = grobid_client.process(pdf)
    upd = {"abstract_ko": None, "abstract_en": None}
    hdr_ok = bool(g["title"]) and len(g["authors"]) > 0
    if not hdr_ok or any("가" <= ch <= "힣" for ch in (g["title"] or "")):
        fix = claude_header_fix.extract(pdf)
        upd.update({k: fix.get(k) for k in ("title_ko", "title_en", "abstract_ko", "abstract_en", "keywords_ko", "keywords_en") if fix.get(k)})
        authors = [{"raw_name": a.get("name_ko") or a.get("name_en"), "raw_affiliation": a.get("affiliation"), "is_corresponding": bool(a.get("corresponding"))} for a in fix.get("authors", [])]
    else:
        upd.update({"title_en": g["title"], "abstract_en": g["abstract"], "keywords_en": g["keywords"] or None})
        authors = [{"raw_name": a["name"], "raw_affiliation": a["affiliation"]} for a in g["authors"]]
    if not p.get("title_ko") and not upd.get("title_ko") and not upd.get("title_en"):
        raise RuntimeError("no title extracted")
    upd = {k: v for k, v in upd.items() if v is not None or k.startswith("abstract")}
    upd["fulltext_status"] = "parsed"; upd["language"] = "ko" if upd.get("title_ko") else "en"
    db().table("papers").update(upd).eq("id", p["id"]).execute()
    db().table("paper_authors").delete().eq("paper_id", p["id"]).execute()
    if authors:
        db().table("paper_authors").insert([{"paper_id": p["id"], "position": i + 1, "is_first": i == 0, **a} for i, a in enumerate(authors) if a.get("raw_name")]).execute()
    db().table("paper_sections").delete().eq("paper_id", p["id"]).execute()
    if g["sections"]:
        db().table("paper_sections").insert([{"paper_id": p["id"], **s} for s in g["sections"]]).execute()
    db().table("references_raw").delete().eq("paper_id", p["id"]).execute()
    if g["references"]:
        db().table("references_raw").insert([{"paper_id": p["id"], **r} for r in g["references"]]).execute()


def do_embed(p: dict):
    secs = db().table("paper_sections").select("id,position,heading,text").eq("paper_id", p["id"]).order("position").execute().data
    chunks = chunker.chunk_sections(secs, CFG["embedding"]["chunk_tokens"], CFG["embedding"]["overlap_tokens"])
    sec_id = {s["position"]: s["id"] for s in secs}
    abstract = p.get("abstract_ko") or p.get("abstract_en")
    texts = [f"{p.get('title_ko') or ''} {p.get('title_en') or ''}\n{abstract or ''}"] + [c["content"] for c in chunks]
    vecs = voyage.embed(texts)
    rows = [{"paper_id": p["id"], "chunk_index": 0, "chunk_type": "abstract", "content": texts[0][:8000], "embedding": vecs[0]}]
    rows += [{"paper_id": p["id"], "section_id": sec_id.get(c["section_position"]), "chunk_index": i + 1, "chunk_type": "text", "content": c["content"][:8000], "token_count": c["token_count"], "embedding": v}
             for i, (c, v) in enumerate(zip(chunks, vecs[1:]))]
    db().table("paper_chunks").delete().eq("paper_id", p["id"]).execute()
    for i in range(0, len(rows), 100):
        db().table("paper_chunks").insert(rows[i:i + 100]).execute()


def do_enrich(p: dict):
    if not p.get("doi"):
        fa = db().table("paper_authors").select("raw_name").eq("paper_id", p["id"]).eq("position", 1).execute().data
        doi = crossref.find_doi(p.get("title_en") or p.get("title_ko"), fa[0]["raw_name"] if fa else None, int(p["published_at"][:4]) if p.get("published_at") else None)
        if doi:
            db().table("papers").update({"doi": doi}).eq("id", p["id"]).execute()
    crossref.match_references(p["id"])


def step(job: dict):
    p = db().table("papers").select("*").eq("id", job["paper_id"]).single().execute().data
    stage = job["stage"]
    try:
        if stage == "uploaded":
            do_parse(p, fetch_pdf(p["fulltext_key"]))
        elif stage == "parsed":
            figures.extract(p["id"], fetch_pdf(p["fulltext_key"]))
        elif stage == "extracted":
            do_embed(p)
        elif stage == "embedded":
            do_enrich(p)
        elif stage == "enriched":
            typesense_sync.ensure(); typesense_sync.client().collections["papers"].documents.upsert(typesense_sync.doc(
                db().table("papers").select("*, venue:venues(title_ko,slug,venue_type), session:sessions(title, society:societies(name_ko)), paper_authors(raw_name,raw_affiliation)").eq("id", p["id"]).single().execute().data))
        set_stage(p["id"], NEXT[stage])
        log.info("paper %s: %s -> %s", p["id"], stage, NEXT[stage])
    except Exception as e:  # noqa
        log.exception("paper %s failed at %s", p["id"], stage)
        db().table("ingest_jobs").update({"stage": "failed", "error": str(e)[:1000]}).eq("paper_id", p["id"]).execute()


def main(once: bool, only: str | None):
    while True:
        q = db().table("ingest_jobs").select("*").in_("stage", [only] if only else list(NEXT.keys())).order("updated_at").limit(50).execute().data
        if not q:
            if once:
                return
            time.sleep(10); continue
        for job in q:
            step(job)
        if once:
            return


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--once", action="store_true"); ap.add_argument("--stage")
    a = ap.parse_args(); main(a.once, a.stage)
