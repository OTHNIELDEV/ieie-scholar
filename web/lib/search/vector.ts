import { supabaseAdmin } from '@/lib/db/server';
import { embed } from '@/lib/ai/embeddings';
import type { SearchHit } from '@/types/models';

/** pgvector 코사인 검색 (rpc: match_chunks — supabase/migrations/0002_search_fns.sql) */
export async function vectorSearch(q: string, k = 30): Promise<SearchHit[]> {
  const [vec] = await embed([q], 'query');
  const { data, error } = await supabaseAdmin().rpc('match_chunks', { query_embedding: vec, match_count: k * 2, min_similarity: 0.25 });
  if (error) throw error;
  const seen = new Map<number, SearchHit>();
  for (const r of data ?? []) {
    if (!seen.has(r.paper_id)) seen.set(r.paper_id, { id: r.paper_id, title_ko: r.title_ko, title_en: r.title_en, year: r.year, venue: r.venue, snippet: r.content?.slice(0, 240), score: r.similarity });
  }
  return [...seen.values()].slice(0, k);
}

export type ChunkHit = { chunk_id: number; paper_id: number; content: string; page: number | null; bbox: number[] | null; title_ko: string | null; title_en: string | null; year: number | null; venue: string | null; similarity: number };

export async function retrieveChunks(q: string, k = 12, paperId?: number): Promise<ChunkHit[]> {
  const [vec] = await embed([q], 'query');
  const { data, error } = await supabaseAdmin().rpc('match_chunks', { query_embedding: vec, match_count: k, min_similarity: 0.2, p_paper_id: paperId ?? null });
  if (error) throw error;
  return (data ?? []) as ChunkHit[];
}
