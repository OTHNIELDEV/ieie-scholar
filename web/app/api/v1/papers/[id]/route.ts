import { NextResponse } from 'next/server';
import { getPaper, getReferences } from '@/lib/db/queries';

/** GET /api/v1/papers/{id|doi} */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const p = await getPaper(decodeURIComponent(params.id));
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const refs = await getReferences(p.id);
  return NextResponse.json({
    id: p.id, doi: p.doi, title: { ko: p.title_ko, en: p.title_en }, abstract: { ko: p.abstract_ko, en: p.abstract_en },
    keywords: { ko: p.keywords_ko, en: p.keywords_en }, published_at: p.published_at, pages: [p.page_start, p.page_end],
    venue: { slug: p.venue.slug, title: p.venue.title_ko, issn: p.venue.issn_print }, issue: p.issue && { id: p.issue.id, volume: p.issue.volume, number: p.issue.number, year: p.issue.year },
    authors: p.paper_authors.sort((a, b) => a.position - b.position).map((a) => ({ name: a.raw_name, affiliation: a.raw_affiliation, author_id: a.author?.id, orcid: a.author?.orcid })),
    oa_status: p.oa_status, award: p.award, metrics: { citations: p.citation_count, views: p.view_count, downloads: p.download_count },
    references: refs.map((r: any) => ({ text: r.raw_text, doi: r.matched_doi, paper_id: r.matched_paper_id })),
    links: p.links, url: `${process.env.NEXT_PUBLIC_SITE_URL}/papers/${p.id}`,
  }, { headers: { 'Cache-Control': 'public, s-maxage=3600', 'Access-Control-Allow-Origin': '*' } });
}
