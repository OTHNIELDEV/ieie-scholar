"""저자 명확화 — 블로킹(정규화 성명) → 쌍 점수(소속·공저자·연도·ORCID·이메일) → 임계값 병합/검수 큐
규칙 기반 v0; 추후 LightGBM 쌍분류기로 교체(ml extra)."""
from __future__ import annotations
import re
from collections import defaultdict
from rapidfuzz import fuzz
from common import db, CFG, log


def norm_name(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[\s\-\.,]+", "", s)
    return s


def pair_score(a: dict, b: dict, coauthors: dict) -> float:
    s = 0.0
    if a.get("orcid") and a.get("orcid") == b.get("orcid"):
        return 1.0
    if a.get("email_hash") and a.get("email_hash") == b.get("email_hash"):
        return 0.98
    aff = fuzz.token_set_ratio(a.get("raw_affiliation") or "", b.get("raw_affiliation") or "") / 100
    s += 0.45 * aff
    ca, cb = coauthors.get(a["paper_id"], set()), coauthors.get(b["paper_id"], set())
    if ca and cb:
        s += 0.35 * (len(ca & cb) / max(1, min(len(ca), len(cb))))
    ya, yb = a.get("year"), b.get("year")
    if ya and yb:
        s += 0.2 * max(0, 1 - abs(ya - yb) / 15)
    return min(s, 0.97)


def run(limit_names: int | None = None):
    rows = db().table("paper_authors").select("paper_id,position,raw_name,raw_affiliation,author_id,paper:papers(published_at)").is_("author_id", "null").limit(50000).execute().data
    for r in rows:
        r["year"] = int(r["paper"]["published_at"][:4]) if r.get("paper") and r["paper"].get("published_at") else None
    coauthors = defaultdict(set)
    for r in rows:
        coauthors[r["paper_id"]].add(norm_name(r["raw_name"]))
    blocks = defaultdict(list)
    for r in rows:
        blocks[norm_name(r["raw_name"])].append(r)
    auto, review = 0, 0
    for i, (name, mentions) in enumerate(blocks.items()):
        if limit_names and i >= limit_names:
            break
        clusters: list[list[dict]] = []
        for m in mentions:
            best, best_s = None, 0
            for c in clusters:
                sc = max(pair_score(m, x, coauthors) for x in c)
                if sc > best_s:
                    best, best_s = c, sc
            if best is not None and best_s >= CFG["disambiguation"]["auto_merge"]:
                best.append(m); auto += 1
            else:
                if best is not None and best_s >= CFG["disambiguation"]["review_min"]:
                    review += 1
                clusters.append([m])
        for c in clusters:
            a = db().table("authors").insert({"name_ko": c[0]["raw_name"], "name_variants": sorted({x["raw_name"] for x in c}), "paper_count": len(c)}).execute().data[0]
            for x in c:
                db().table("paper_authors").update({"author_id": a["id"], "disambiguation_score": 1.0 if len(c) == 1 else CFG["disambiguation"]["auto_merge"]}).eq("paper_id", x["paper_id"]).eq("position", x["position"]).execute()
    log.info("blocks=%d auto_merged=%d review_candidates=%d", len(blocks), auto, review)


if __name__ == "__main__":
    run()
