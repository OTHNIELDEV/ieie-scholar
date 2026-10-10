"""GROBID 헤더가 비었거나 한글 저자/소속 분리가 깨진 경우 — 첫 2쪽 텍스트로 Claude Haiku 재추출"""
from __future__ import annotations
import json
import fitz
from common import claude, CFG

SCHEMA = {
  "title_ko": "string|null", "title_en": "string|null", "abstract_ko": "string|null", "abstract_en": "string|null",
  "keywords_ko": ["string"], "keywords_en": ["string"],
  "authors": [{"name_ko": "string|null", "name_en": "string|null", "affiliation": "string|null", "email": "string|null", "corresponding": "bool"}],
}
PROMPT = """다음은 대한전자공학회 논문의 첫 2쪽 텍스트입니다. 서지 정보를 JSON으로만 추출하세요.
규칙: 한글/영문 제목·초록·키워드를 분리. 저자는 한글명과 영문명을 각각, 소속은 '학교/기관명 학과' 수준으로. 교신저자는 *, † 표시나 이메일 매칭으로 판단. 없는 값은 null.
스키마: %s
---
%s"""


def first_pages_text(pdf_bytes: bytes, n: int = 2) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    return "\n".join(doc[i].get_text() for i in range(min(n, len(doc))))


def extract(pdf_bytes: bytes) -> dict:
    txt = first_pages_text(pdf_bytes)[:12000]
    msg = claude().messages.create(model=CFG["claude"]["fast"], max_tokens=1500, temperature=0,
                                   messages=[{"role": "user", "content": PROMPT % (json.dumps(SCHEMA, ensure_ascii=False), txt)}])
    body = msg.content[0].text
    body = body[body.find("{"): body.rfind("}") + 1]
    return json.loads(body)
