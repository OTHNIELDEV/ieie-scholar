import { Suspense } from 'react';
import Link from 'next/link';
import { hybridSearch } from '@/lib/search';
import { PaperCard } from '@/components/paper-card';
import { fmt } from '@/lib/utils';
import type { SearchParams } from '@/types/models';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const p: SearchParams = {
    q: searchParams.q ?? '', page: Number(searchParams.page ?? 1), per: 20,
    year_from: searchParams.year_from ? Number(searchParams.year_from) : undefined,
    year_to: searchParams.year_to ? Number(searchParams.year_to) : undefined,
    society: searchParams.society, venue: searchParams.venue, type: searchParams.type,
    oa: searchParams.oa === '1', sort: (searchParams.sort as any) ?? 'relevance',
  };
  const { hits, total } = p.q ? await hybridSearch(p).catch((e) => ({ hits: [], total: 0, error: String(e) })) : { hits: [], total: 0 };
  const link = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v)), ...patch } as any);
    for (const [k, v] of Object.entries(patch)) if (!v) u.delete(k);
    return `/search?${u.toString()}`;
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 grid md:grid-cols-[14rem_1fr] gap-8">
      <aside className="text-sm space-y-5">
        <Facet title="정렬">{[['relevance', '관련도'], ['newest', '최신'], ['cited', '피인용'], ['viewed', '이용수']].map(([v, l]) => (
          <Link key={v} href={link({ sort: v, page: undefined })} className={p.sort === v ? 'text-brand-600 font-medium' : ''}>{l}</Link>))}</Facet>
        <Facet title="자료유형">{[['', '전체'], ['journal', '논문지'], ['conference_domestic', '국내학술대회'], ['conference_intl', '국제학술대회'], ['magazine', '회지']].map(([v, l]) => (
          <Link key={v} href={link({ type: v || undefined, page: undefined })} className={(p.type ?? '') === v ? 'text-brand-600 font-medium' : ''}>{l}</Link>))}</Facet>
        <Facet title="소사이어티">{['통신', '반도체', '컴퓨터', '인공지능신호처리', '시스템및제어', '산업전자'].map((s) => (
          <Link key={s} href={link({ society: p.society === s ? undefined : s, page: undefined })} className={p.society === s ? 'text-brand-600 font-medium' : ''}>{s}</Link>))}</Facet>
        <Facet title="접근"><Link href={link({ oa: p.oa ? undefined : '1' })} className={p.oa ? 'text-brand-600 font-medium' : ''}>Open Access만</Link></Facet>
        <Facet title="연도">
          <form className="flex gap-1 items-center" action="/search">
            {Object.entries(searchParams).filter(([k]) => !['year_from', 'year_to'].includes(k)).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
            <input name="year_from" defaultValue={p.year_from} placeholder="1990" className="w-16 border rounded px-1 bg-transparent" />~
            <input name="year_to" defaultValue={p.year_to} placeholder="2026" className="w-16 border rounded px-1 bg-transparent" />
            <button className="btn !px-2 !py-0.5">적용</button>
          </form>
        </Facet>
      </aside>
      <section>
        <p className="text-sm text-gray-500">“{p.q}” 검색 결과 {fmt(total)}건 · <Link href={`/ai?q=${encodeURIComponent(p.q)}`} className="text-brand-600">AI에게 묻기 →</Link></p>
        <Suspense>{hits.map((h) => <PaperCard key={h.id} p={h} />)}</Suspense>
        {p.q && hits.length === 0 && <p className="py-10 text-gray-400">결과가 없습니다.</p>}
        <nav className="mt-6 flex gap-2 text-sm">
          {p.page! > 1 && <Link className="btn" href={link({ page: String(p.page! - 1) })}>이전</Link>}
          {hits.length === p.per && <Link className="btn" href={link({ page: String(p.page! + 1) })}>다음</Link>}
        </nav>
      </section>
    </div>
  );
}
function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{title}</h3><div className="flex flex-col gap-1 text-gray-600 dark:text-gray-400">{children}</div></div>;
}
