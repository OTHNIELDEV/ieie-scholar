"""성능 지표 정규화 — 표/캡션 텍스트 → {metric,value,unit,condition} (Claude Sonnet) → paper_specs"""
from __future__ import annotations
import json
from common import db, claude, CFG

PROMPT = """전자공학 논문의 성능 요약 표/캡션입니다. 측정 지표를 정규화된 JSON 배열로 추출하세요.
각 항목: {"metric": 소문자 영문 스네이크(power, area, frequency, gain, noise_figure, snr, accuracy, latency, throughput, energy_per_op 등), "value": 숫자, "unit": 단위, "condition": "공정/전압/온도 등", "confidence": 0~1}
이 논문(This work) 결과만 추출하고, 비교 대상 타 논문 값은 제외. JSON 배열만 출력.
---
%s"""


def run(paper_id: int):
    figs = db().table("paper_figures").select("id,caption,extracted_data").eq("paper_id", paper_id).eq("fig_type", "table").execute().data
    for f in figs:
        src = json.dumps(f.get("extracted_data"), ensure_ascii=False) if f.get("extracted_data") else (f.get("caption") or "")
        if len(src) < 20:
            continue
        msg = claude().messages.create(model=CFG["claude"]["smart"], max_tokens=1200, temperature=0, messages=[{"role": "user", "content": PROMPT % src[:6000]}])
        t = msg.content[0].text
        try:
            items = json.loads(t[t.find("["): t.rfind("]") + 1])
        except Exception:
            continue
        rows = [{"paper_id": paper_id, "figure_id": f["id"], **{k: i.get(k) for k in ("metric", "value", "unit", "condition", "confidence")}} for i in items if i.get("metric") and i.get("value") is not None]
        if rows:
            db().table("paper_specs").insert(rows).execute()
