"""소사이어티/세부분류 다중 라벨 분류 — Claude Haiku few-shot, subject_codes 테이블 기반"""
from __future__ import annotations
import json
from common import db, claude, CFG

PROMPT = """대한전자공학회 논문을 분류합니다. 아래 분류표에서 가장 적합한 코드를 1~3개 고르고, 소사이어티 코드 1개를 지정하세요.
JSON만 출력: {"society":"COMM|SEMI|COMP|AISP|SYSC|INDE","subjects":["code",...]}
분류표:
%s
---
제목: %s
초록: %s
키워드: %s"""


def classify(paper: dict, table: str) -> dict:
    msg = claude().messages.create(model=CFG["claude"]["fast"], max_tokens=200, temperature=0,
        messages=[{"role": "user", "content": PROMPT % (table, paper.get("title_ko") or paper.get("title_en"), (paper.get("abstract_ko") or paper.get("abstract_en") or "")[:1500], paper.get("keywords_ko") or paper.get("keywords_en"))}])
    t = msg.content[0].text
    return json.loads(t[t.find("{"): t.rfind("}") + 1])


def run(limit: int = 500):
    codes = db().table("subject_codes").select("id,code,name_ko,society_id").execute().data
    table = "\n".join(f"{c['code']}: {c['name_ko']}" for c in codes)
    by_code = {c["code"]: c["id"] for c in codes}
    rows = db().table("papers").select("id,title_ko,title_en,abstract_ko,abstract_en,keywords_ko,keywords_en").is_("subject_ids", "null").limit(limit).execute().data
    for p in rows:
        try:
            r = classify(p, table)
            db().table("papers").update({"subject_ids": [by_code[c] for c in r.get("subjects", []) if c in by_code]}).eq("id", p["id"]).execute()
        except Exception as e:  # noqa
            db().table("papers").update({"quality_flags": {"classify_error": str(e)[:200]}}).eq("id", p["id"]).execute()


if __name__ == "__main__":
    run()
