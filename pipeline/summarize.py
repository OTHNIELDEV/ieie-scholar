"""AI 요약 5종 사전 생성 — Claude Batch API (50% 할인) + 프롬프트 캐시. paper_summaries 적재"""
from __future__ import annotations
import json, time
from common import db, claude, CFG, log

KINDS = {
    "one_line": "이 논문을 전자공학 연구자 대상으로 한 문장(60자 이내)으로 요약하라.",
    "toc": "논문의 목차 구조를 따라 섹션별 핵심을 각 1~2문장으로 정리하라.",
    "method": "연구 배경·목적 / 대상·방법 / 분석·수행 / 결과·의의 4항목으로 정리하라. 수치·단위는 원문 그대로.",
    "easy": "학부 2학년 수준으로 쉬운 문장과 짧은 단락으로 요약하고, 핵심 용어 3개에 한 줄 정의를 붙여라.",
    "key_points": "핵심 기여(contribution) 3~5개를 불릿으로, 각 항목에 근거 페이지(p.N)를 붙여라.",
}
SYSTEM = "당신은 대한전자공학회 논문 요약 전문가입니다. 제공된 본문에 없는 내용은 쓰지 않습니다. 한국어로 답합니다."


def body_text(paper_id: int, max_chars: int = 60000) -> str:
    secs = db().table("paper_sections").select("heading,text,page_from").eq("paper_id", paper_id).order("position").execute().data
    return "\n\n".join(f"## {s.get('heading') or ''} (p.{s.get('page_from') or '?'})\n{s.get('text') or ''}" for s in secs)[:max_chars]


def build_requests(paper_ids: list[int]) -> list[dict]:
    reqs = []
    for pid in paper_ids:
        body = body_text(pid)
        if len(body) < 500:
            continue
        for kind, instr in KINDS.items():
            reqs.append({"custom_id": f"{pid}-{kind}", "params": {
                "model": CFG["claude"]["smart"], "max_tokens": 900, "system": SYSTEM,
                "messages": [{"role": "user", "content": [
                    {"type": "text", "text": f"[논문 본문]\n{body}", "cache_control": {"type": "ephemeral"}},
                    {"type": "text", "text": f"[지시]\n{instr}"}]}]}})
    return reqs


def run(limit: int = 200):
    ids = [r["id"] for r in db().table("papers").select("id").eq("ai_summary_ready", False).eq("fulltext_status", "parsed").limit(limit).execute().data]
    reqs = build_requests(ids)
    if not reqs:
        log.info("nothing to do"); return
    batch = claude().messages.batches.create(requests=reqs)
    log.info("batch %s submitted (%d requests)", batch.id, len(reqs))
    while (b := claude().messages.batches.retrieve(batch.id)).processing_status != "ended":
        time.sleep(30)
    done = set()
    for res in claude().messages.batches.results(batch.id):
        pid, kind = res.custom_id.split("-", 1)
        if res.result.type == "succeeded":
            db().table("paper_summaries").upsert({"paper_id": int(pid), "kind": kind, "lang": "ko", "content": res.result.message.content[0].text, "model": CFG["claude"]["smart"]}).execute()
            done.add(int(pid))
    for pid in done:
        db().table("papers").update({"ai_summary_ready": True}).eq("id", pid).execute()
    log.info("summaries done for %d papers", len(done))


if __name__ == "__main__":
    run()
