"""Voyage AI 임베딩 배치 (문서 128개/요청). provider=local 이면 bge-m3(sentence-transformers)로 교체."""
from __future__ import annotations
from common import CFG
_client = None


def embed(texts: list[str], input_type: str = "document") -> list[list[float]]:
    global _client
    if CFG["embedding"]["provider"] == "voyage":
        import voyageai
        _client = _client or voyageai.Client()
        out = []
        for i in range(0, len(texts), 128):
            out += _client.embed(texts[i:i + 128], model=CFG["embedding"]["model"], input_type=input_type, output_dimension=CFG["embedding"]["dim"]).embeddings
        return out
    from sentence_transformers import SentenceTransformer  # type: ignore
    _client = _client or SentenceTransformer("BAAI/bge-m3")
    return _client.encode(texts, normalize_embeddings=True).tolist()
