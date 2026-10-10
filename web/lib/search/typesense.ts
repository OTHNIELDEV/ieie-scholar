import Typesense from 'typesense';
import type { SearchHit, SearchParams } from '@/types/models';

export const typesenseEnabled = () => Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_SEARCH_KEY);

const client = () => new Typesense.Client({
  nodes: [{ host: process.env.TYPESENSE_HOST!, port: 443, protocol: 'https' }],
  apiKey: process.env.TYPESENSE_SEARCH_KEY!,
  connectionTimeoutSeconds: 3,
});

/** 컬렉션 스키마 — pipeline/index/typesense_sync.py 와 동일하게 유지 */
export const PAPERS_SCHEMA = {
  name: 'papers',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title_ko', type: 'string', locale: 'ko', optional: true },
    { name: 'title_en', type: 'string', optional: true },
    { name: 'abstract', type: 'string', locale: 'ko', optional: true },
    { name: 'keywords', type: 'string[]', optional: true, facet: true },
    { name: 'authors', type: 'string[]', optional: true },
    { name: 'affiliations', type: 'string[]', optional: true, facet: true },
    { name: 'venue', type: 'string', facet: true },
    { name: 'venue_slug', type: 'string', facet: true },
    { name: 'venue_type', type: 'string', facet: true },
    { name: 'year', type: 'int32', facet: true },
    { name: 'society', type: 'string', optional: true, facet: true },
    { name: 'session', type: 'string', optional: true, facet: true },
    { name: 'award', type: 'string', optional: true, facet: true },
    { name: 'oa', type: 'bool', facet: true },
    { name: 'has_figures', type: 'bool', facet: true },
    { name: 'has_code', type: 'bool', facet: true },
    { name: 'citation_count', type: 'int32' },
    { name: 'view_count', type: 'int32' },
  ],
  default_sorting_field: 'citation_count',
} as const;

export async function typesenseSearch(p: SearchParams, limit: number): Promise<{ hits: SearchHit[]; total: number }> {
  const filters: string[] = [];
  if (p.year_from) filters.push(`year:>=${p.year_from}`);
  if (p.year_to) filters.push(`year:<=${p.year_to}`);
  if (p.society) filters.push(`society:=${p.society}`);
  if (p.venue) filters.push(`venue_slug:=${p.venue}`);
  if (p.type) filters.push(`venue_type:=${p.type}`);
  if (p.oa) filters.push('oa:=true');
  const sort_by = p.sort === 'newest' ? 'year:desc' : p.sort === 'cited' ? 'citation_count:desc' : p.sort === 'viewed' ? 'view_count:desc' : '_text_match:desc,citation_count:desc';
  const res: any = await client().collections('papers').documents().search({
    q: p.q, query_by: 'title_ko,title_en,keywords,abstract,authors', query_by_weights: '5,5,3,1,2',
    filter_by: filters.join(' && ') || undefined, sort_by, per_page: Math.min(limit, 250), page: 1,
    highlight_fields: 'abstract', snippet_threshold: 30, num_typos: 1, facet_by: 'year,society,venue,award,oa',
  });
  const hits: SearchHit[] = (res.hits ?? []).map((h: any) => ({
    id: Number(h.document.id), title_ko: h.document.title_ko, title_en: h.document.title_en, authors: h.document.authors,
    venue: h.document.venue, year: h.document.year, society: h.document.society, award: h.document.award, oa: h.document.oa,
    snippet: h.highlight?.abstract?.snippet, score: h.text_match,
  }));
  return { hits, total: res.found ?? hits.length };
}
