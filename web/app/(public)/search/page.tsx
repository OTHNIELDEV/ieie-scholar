import { Suspense } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Sparkles } from 'lucide-react';
import { hybridSearch } from '@/lib/search';
import { PaperCard } from '@/components/paper-card';
import { cn, fmt } from '@/lib/utils';
import type { SearchParams } from '@/types/models';

export const dynamic = 'force-dynamic';

const SORTS = [['relevance', '관련도'], ['newest', '최신'], ['cited', '피인용'], ['viewed', '이용수']];
const TYPES = [['', '전체'], ['journal', '논문지'], ['conference_domestic', '국내학술대회'], ['conference_intl', '국제학술대회'], ['magazine', '회지']];
const SOCIETIES = ['통신', '반도체', '컴퓨터', '인공지능신호처리', '시스템및제어', '산업전자'];

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
  const activeFilters = [p.type, p.society, p.oa, p.year_from, p.year_to].filter(Boolean).length;

  // 모바일(접힘)과 데스크톱(사이드바)에 두 번 그리므로 id 접두사로 중복을 피한다
  const facets = (idPrefix: string) => (
    <div className="space-y-7">
      <Facet title="자료유형">{TYPES.map(([v, l]) => (
        <FacetLink key={v} href={link({ type: v || undefined, page: undefined })} active={(p.type ?? '') === v}>{l}</FacetLink>))}</Facet>
      <Facet title="소사이어티">{SOCIETIES.map((s) => (
        <FacetLink key={s} href={link({ society: p.society === s ? undefined : s, page: undefined })} active={p.society === s}>{s}</FacetLink>))}</Facet>
      <Facet title="접근"><FacetLink href={link({ oa: p.oa ? undefined : '1' })} active={!!p.oa}>Open Access만 보기</FacetLink></Facet>
      <Facet title="발행 연도">
        <form className="flex items-center gap-2" action="/search">
          {Object.entries(searchParams).filter(([k]) => !['year_from', 'year_to'].includes(k)).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
          <label className="sr-only" htmlFor={`${idPrefix}-year_from`}>시작 연도</label>
          <input id={`${idPrefix}-year_from`} name="year_from" inputMode="numeric" defaultValue={p.year_from} placeholder="1990" className="num h-10 w-20 rounded-md border border-line-strong bg-surface px-2 text-base sm:h-9 sm:text-sm" />
          <span className="text-faint" aria-hidden="true">–</span>
          <label className="sr-only" htmlFor={`${idPrefix}-year_to`}>끝 연도</label>
          <input id={`${idPrefix}-year_to`} name="year_to" inputMode="numeric" defaultValue={p.year_to} placeholder="2026" className="num h-10 w-20 rounded-md border border-line-strong bg-surface px-2 text-base sm:h-9 sm:text-sm" />
          <button className="btn px-2.5">적용</button>
        </form>
      </Facet>
    </div>
  );

  return (
    <div className="container-page py-8 sm:py-10">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="title-serif text-2xl sm:text-3xl">{p.q ? `“${p.q}”` : '논문 검색'}</h1>
          <p className="mt-2 text-sm text-muted">
            {p.q ? <>검색 결과 <b className="num font-semibold text-ink">{fmt(total)}</b>건</> : '상단 검색창에 논문 제목, 저자, 키워드를 입력하세요.'}
          </p>
        </div>
        {p.q && (
          <Link href={`/ai?q=${encodeURIComponent(p.q)}`} className="btn shrink-0 self-start border-signal/50 text-signal hover:border-signal hover:bg-signal/5 sm:self-auto">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> 이 주제로 AI에게 묻기
          </Link>
        )}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_1fr] lg:gap-12">
        <aside aria-label="검색 필터" className="text-sm">
          <details className="group rounded-lg border border-line bg-surface lg:hidden">
            <summary className="flex h-12 items-center gap-2 px-4 font-medium">
              <SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden="true" /> 필터
              {activeFilters > 0 && <span className="num rounded-full bg-accent/10 px-2 text-xs text-accent">{activeFilters}</span>}
              <ChevronDown className="ml-auto h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-line p-4 sm:columns-2 sm:gap-8 [&>div>fieldset]:break-inside-avoid">{facets('m')}</div>
          </details>
          <div className="sticky top-24 hidden lg:block">{facets('d')}</div>
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <h2 id="results-heading" className="sr-only">검색 결과</h2>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max items-center gap-1 border-b border-line pb-3 text-sm" role="group" aria-label="정렬">
              <span className="mr-2 text-muted">정렬</span>
              {SORTS.map(([v, l]) => (
                <Link key={v} href={link({ sort: v, page: undefined })} aria-current={p.sort === v ? 'true' : undefined}
                  className={cn('inline-flex min-h-9 items-center rounded-md px-3 transition-colors duration-150 [@media(pointer:coarse)]:min-h-11', p.sort === v ? 'bg-ink font-medium text-paper' : 'text-muted hover:bg-sunken hover:text-ink')}>{l}</Link>
              ))}
            </div>
          </div>
          <div className="divide-y divide-line">
            <Suspense>{hits.map((h) => <PaperCard key={h.id} p={h} />)}</Suspense>
          </div>
          {p.q && hits.length === 0 && (
            <div className="py-16 text-center">
              <p className="title-serif text-lg">“{p.q}”와 일치하는 논문이 없습니다</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">필터를 풀거나 더 짧은 키워드로 검색해 보세요. 문장으로 물어보면 AI가 관련 논문을 찾아 줍니다.</p>
              <Link href={`/ai?q=${encodeURIComponent(p.q)}`} className="btn mt-5 text-signal"><Sparkles className="h-4 w-4" aria-hidden="true" /> AI에게 묻기</Link>
            </div>
          )}
          {(p.page! > 1 || hits.length === p.per) && (
            <nav aria-label="페이지 이동" className="mt-8 flex items-center justify-between border-t border-line pt-6 text-sm">
              {p.page! > 1 ? <Link className="btn" href={link({ page: String(p.page! - 1) })}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> 이전</Link> : <span />}
              <span className="num text-muted">{p.page} 페이지</span>
              {hits.length === p.per ? <Link className="btn" href={link({ page: String(p.page! + 1) })}>다음 <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link> : <span />}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold text-ink">{title}</legend>
      <div className="flex flex-col">{children}</div>
    </fieldset>
  );
}

function FacetLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'true' : undefined}
      className={cn('-ml-3 border-l-2 py-2.5 pl-3 transition-colors duration-150 lg:py-1.5', active ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:border-line-strong hover:text-ink')}>
      {children}
    </Link>
  );
}
