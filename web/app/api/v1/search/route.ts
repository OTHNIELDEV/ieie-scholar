import { NextResponse } from 'next/server';
import { hybridSearch } from '@/lib/search';

/** GET /api/v1/search?q=&page=&per=&year_from=&year_to=&society=&venue=&type=&oa=1&sort=  (서지 공개 API, 무료) */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams.get('q') ?? '';
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });
  const r = await hybridSearch({
    q, page: Number(u.searchParams.get('page') ?? 1), per: Math.min(Number(u.searchParams.get('per') ?? 20), 100),
    year_from: num(u.searchParams.get('year_from')), year_to: num(u.searchParams.get('year_to')),
    society: u.searchParams.get('society') ?? undefined, venue: u.searchParams.get('venue') ?? undefined, type: u.searchParams.get('type') ?? undefined,
    oa: u.searchParams.get('oa') === '1', sort: (u.searchParams.get('sort') as any) ?? 'relevance',
  });
  return NextResponse.json(r, { headers: { 'Cache-Control': 'public, s-maxage=60', 'Access-Control-Allow-Origin': '*' } });
}
const num = (v: string | null) => (v ? Number(v) : undefined);
