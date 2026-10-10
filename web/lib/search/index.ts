import { supabaseAdmin } from '@/lib/db/server';
import type { SearchHit, SearchParams } from '@/types/models';
import { typesenseSearch, typesenseEnabled } from './typesense';
import { vectorSearch } from './vector';

/** 하이브리드 검색: (Typesense BM25 | Postgres FTS) + pgvector → RRF 융합 */
export async function hybridSearch(p: SearchParams): Promise<{ hits: SearchHit[]; total: number }> {
  const per = p.per ?? 20;
  const page = p.page ?? 1;
  const [lex, vec] = await Promise.all([
    typesenseEnabled() ? typesenseSearch(p, per * 3) : pgSearch(p, per * 3),
    p.q.length >= 4 ? vectorSearch(p.q, per * 3).catch(() => []) : Promise.resolve([]),
  ]);
  if (p.sort && p.sort !== 'relevance') return { hits: lex.hits.slice((page - 1) * per, page * per), total: lex.total };

  // Reciprocal Rank Fusion
  const k = 60;
  const score = new Map<number, number>();
  const byId = new Map<number, SearchHit>();
  lex.hits.forEach((h, i) => { score.set(h.id, (score.get(h.id) ?? 0) + 1 / (k + i)); byId.set(h.id, h); });
  vec.forEach((h, i) => { score.set(h.id, (score.get(h.id) ?? 0) + 1 / (k + i)); if (!byId.has(h.id)) byId.set(h.id, h); });
  const fused = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id, s]) => ({ ...byId.get(id)!, score: s }));
  return { hits: fused.slice((page - 1) * per, page * per), total: Math.max(lex.total, fused.length) };
}

/** Typesense 미설정 시 Postgres FTS/trigram 폴백 */
async function pgSearch(p: SearchParams, limit: number): Promise<{ hits: SearchHit[]; total: number }> {
  const db = supabaseAdmin();
  let q = db
    .from('papers')
    .select('id, title_ko, title_en, abstract_ko, published_at, award, oa_status, venue:venues!inner(title_ko, slug), paper_authors(raw_name)', { count: 'exact' })
    .textSearch('search_vector', p.q.split(/\s+/).filter(Boolean).join(' & '), { config: 'simple' });
  if (p.year_from) q = q.gte('published_at', `${p.year_from}-01-01`);
  if (p.year_to) q = q.lte('published_at', `${p.year_to}-12-31`);
  if (p.venue) q = q.eq('venues.slug', p.venue);
  if (p.oa) q = q.in('oa_status', ['diamond', 'gold', 'green']);
  const order = p.sort === 'newest' ? 'published_at' : p.sort === 'cited' ? 'citation_count' : p.sort === 'viewed' ? 'view_count' : null;
  if (order) q = q.order(order, { ascending: false, nullsFirst: false });
  const { data, count } = await q.limit(limit);
  const hits: SearchHit[] = (data ?? []).map((r: any) => ({
    id: r.id, title_ko: r.title_ko, title_en: r.title_en, abstract: r.abstract_ko?.slice(0, 240),
    authors: r.paper_authors?.map((a: any) => a.raw_name), venue: r.venue?.title_ko,
    year: r.published_at ? Number(r.published_at.slice(0, 4)) : undefined, award: r.award, oa: ['diamond', 'gold', 'green'].includes(r.oa_status),
  }));
  return { hits, total: count ?? hits.length };
}
