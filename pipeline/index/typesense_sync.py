"""Postgres → Typesense 동기화 (web/lib/search/typesense.ts PAPERS_SCHEMA 와 동일)"""
from __future__ import annotations
import os, typesense
from common import db, log

SCHEMA = {"name": "papers", "fields": [
    {"name": "id", "type": "string"}, {"name": "title_ko", "type": "string", "locale": "ko", "optional": True}, {"name": "title_en", "type": "string", "optional": True},
    {"name": "abstract", "type": "string", "locale": "ko", "optional": True}, {"name": "keywords", "type": "string[]", "optional": True, "facet": True},
    {"name": "authors", "type": "string[]", "optional": True}, {"name": "affiliations", "type": "string[]", "optional": True, "facet": True},
    {"name": "venue", "type": "string", "facet": True}, {"name": "venue_slug", "type": "string", "facet": True}, {"name": "venue_type", "type": "string", "facet": True},
    {"name": "year", "type": "int32", "facet": True}, {"name": "society", "type": "string", "optional": True, "facet": True}, {"name": "session", "type": "string", "optional": True, "facet": True},
    {"name": "award", "type": "string", "optional": True, "facet": True}, {"name": "oa", "type": "bool", "facet": True}, {"name": "has_figures", "type": "bool", "facet": True},
    {"name": "has_code", "type": "bool", "facet": True}, {"name": "citation_count", "type": "int32"}, {"name": "view_count", "type": "int32"},
], "default_sorting_field": "citation_count"}


def client():
    return typesense.Client({"nodes": [{"host": os.environ["TYPESENSE_HOST"], "port": "443", "protocol": "https"}], "api_key": os.environ["TYPESENSE_API_KEY"], "connection_timeout_seconds": 10})


def ensure():
    c = client()
    try:
        c.collections["papers"].retrieve()
    except Exception:
        c.collections.create(SCHEMA)


def doc(p: dict) -> dict:
    sess = p.get("session") or {}
    soc = (sess.get("society") or {}).get("name_ko") if sess else None
    return {"id": str(p["id"]), "title_ko": p.get("title_ko"), "title_en": p.get("title_en"), "abstract": (p.get("abstract_ko") or p.get("abstract_en") or "")[:4000],
            "keywords": (p.get("keywords_ko") or []) + (p.get("keywords_en") or []), "authors": [a["raw_name"] for a in p.get("paper_authors", [])],
            "affiliations": [a["raw_affiliation"] for a in p.get("paper_authors", []) if a.get("raw_affiliation")],
            "venue": p["venue"]["title_ko"], "venue_slug": p["venue"]["slug"], "venue_type": p["venue"]["venue_type"],
            "year": int(p["published_at"][:4]) if p.get("published_at") else 0, "society": soc, "session": sess.get("title") if sess else None,
            "award": p.get("award"), "oa": p.get("oa_status") in ("diamond", "gold", "green"), "has_figures": bool(p.get("has_figures")), "has_code": bool(p.get("has_code_link")),
            "citation_count": p.get("citation_count") or 0, "view_count": p.get("view_count") or 0}


def run(batch: int = 500):
    ensure()
    c = client(); off = 0
    while True:
        rows = db().table("papers").select("*, venue:venues(title_ko,slug,venue_type), session:sessions(title, society:societies(name_ko)), paper_authors(raw_name,raw_affiliation)").range(off, off + batch - 1).execute().data
        if not rows:
            break
        res = c.collections["papers"].documents.import_([doc(p) for p in rows], {"action": "upsert"})
        log.info("indexed %d (offset %d)", len(rows), off); off += batch


if __name__ == "__main__":
    run()
