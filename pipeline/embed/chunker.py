"""섹션 경계 우선 청킹(~800토큰, 100 오버랩). 토큰 근사: 한글 1자≈1토큰, 영문 4자≈1토큰"""
from __future__ import annotations
import re


def approx_tokens(s: str) -> int:
    ko = len(re.findall(r"[가-힣]", s))
    return ko + (len(s) - ko) // 4


def chunk_sections(sections: list[dict], max_tokens: int = 800, overlap: int = 100) -> list[dict]:
    out = []
    for sec in sections:
        text = (sec.get("text") or "").strip()
        if not text:
            continue
        paras = [p for p in re.split(r"\n{1,}", text) if p.strip()]
        buf, buf_tok, idx = [], 0, 0
        for p in paras:
            t = approx_tokens(p)
            if buf and buf_tok + t > max_tokens:
                out.append({"section_position": sec["position"], "chunk_index": idx, "content": f"{sec.get('heading') or ''}\n" + "\n".join(buf), "token_count": buf_tok})
                idx += 1
                # overlap: 마지막 문단 일부 유지
                tail = buf[-1][-overlap * 2:] if buf else ""
                buf, buf_tok = ([tail] if tail else []), approx_tokens(tail)
            buf.append(p); buf_tok += t
        if buf:
            out.append({"section_position": sec["position"], "chunk_index": idx, "content": f"{sec.get('heading') or ''}\n" + "\n".join(buf), "token_count": buf_tok})
    return out
