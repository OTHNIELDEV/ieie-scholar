"""KCI Open API로 초록·키워드 보강 (전자공학회논문지 등 KCI 등재지)
사전 조건: .env 에 KCI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
주의: KCI 서버는 해외 IP·비브라우저 요청을 차단하므로 **국내 PC에서** 실행하고 브라우저 UA를 사용합니다.
사용: python -m enrich.kci --venue j-ieie --limit 500
"""
from __future__ import annotations
import argparse, os, time, re
import httpx
from lxml import etree
from rapidfuzz import fuzz
from common import db, log

BASE = "https://open.kci.go.kr/po/openapi/openApiSearch.kci"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "Accept": "*/*", "Referer": "https://www.kci.go.kr/"}


def kci(params: dict) -> etree._Element:
    p = {"key": os.environ["KCI_API_KEY"], **params}
    r = httpx.get(BASE, params=p, headers=UA, timeout=60)
    r.raise_for_status()
    return etree.fromstring(r.content)


def t(el, path):
    x = el.find(path)
    return (x.text or "").strip() if x is not None and x.text else None


def search_by_title(title: str, year: int | None):
    root = kci({"apiCode": "articleSearch", "title": title[:200], "displayCount": 5, **({"pubYear": year} if year else {})})
    out = []
    for rec in root.iter("record"):
        out.append({"id": t(rec, ".//articleID") or t(rec, ".//article-id"), "title": t(rec, ".//title-group/article-title") or t(rec, ".//article-title"),
                    "year": t(rec, ".//pub-date/year") or t(rec, ".//pubYear"), "doi": t(rec, ".//doi")})
    return out


def detail(article_id: str) -> dict:
    root = kci({"apiCode": "articleDetail", "id": article_id})
    abs_ko = abs_en = None
    for a in root.iter("abstract"):
        lang = (a.get("lang") or a.get("{http://www.w3.org/XML/1998/namespace}lang") or "").lower()
        txt = "".join(a.itertext()).strip()
        if lang.startswith("ko") or (not lang and re.search(r"[가-힣]", txt)):
            abs_ko = abs_ko or txt
        else:
            abs_en = abs_en or txt
    kws_ko, kws_en = [], []
    for k in root.iter("keyword"):
        txt = "".join(k.itertext()).strip()
        if txt:
            (kws_ko if re.search(r"[가-힣]", txt) else kws_en).append(txt)
    return {"abstract_ko": abs_ko, "abstract_en": abs_en, "keywords_ko": kws_ko or None, "keywords_en": kws_en or None}


def run(venue_slug: str, limit: int):
    v = db().table("venues").select("id").eq("slug", venue_slug).single().execute().data
    rows = db().table("papers").select("id,doi,title_ko,title_en,published_at").eq("venue_id", v["id"]).is_("abstract_en", "null").is_("abstract_ko", "null").limit(limit).execute().data
    ok = miss = 0
    for p in rows:
        title = p["title_en"] or p["title_ko"]
        year = int(p["published_at"][:4]) if p.get("published_at") else None
        try:
            cands = search_by_title(title, year)
            best = None
            for c in cands:
                if c["doi"] and p["doi"] and c["doi"].lower() == p["doi"].lower():
                    best = c; break
                if c["title"] and fuzz.ratio(c["title"].lower(), title.lower()) >= 92:
                    best = best or c
            if not best or not best["id"]:
                miss += 1; continue
            d = detail(best["id"])
            d["legacy_ids"] = {"crossref": True, "kci": best["id"]}
            db().table("papers").update(d).eq("id", p["id"]).execute()
            ok += 1
        except Exception as e:  # noqa
            log.warning("paper %s: %s", p["id"], e)
            time.sleep(2)
        time.sleep(0.4)  # 공공 서비스 배려
    log.info("enriched=%d missed=%d", ok, miss)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--venue", default="j-ieie"); ap.add_argument("--limit", type=int, default=300)
    a = ap.parse_args(); run(a.venue, a.limit)
