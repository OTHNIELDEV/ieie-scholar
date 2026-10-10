/** Voyage AI 임베딩 (파이프라인과 동일 모델 사용 — voyage-3-large, 1024d) */
export async function embed(texts: string[], inputType: 'query' | 'document' = 'document'): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY not set');
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: texts, model: 'voyage-3-large', input_type: inputType, output_dimension: 1024 }),
  });
  if (!res.ok) throw new Error(`voyage ${res.status}`);
  const j = await res.json();
  return j.data.map((d: any) => d.embedding);
}
