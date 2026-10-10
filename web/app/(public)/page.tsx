import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { SignalTrace } from '@/components/signal-trace';
import { getHomeData } from '@/lib/db/queries';
import { fmt } from '@/lib/utils';

export const revalidate = 600;

const EXAMPLE_QUERIES = ['저잡음 증폭기 잡음지수', '6G 빔포밍', '뉴로모픽 반도체', '자율주행 센서 융합', 'GaN 전력 변환'];

export default async function Home() {
  const { latest, top, venues } = await getHomeData().catch(() => ({ latest: [], top: [], venues: [] }));
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="scope-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="container-page relative pb-8 pt-12 sm:pb-10 sm:pt-20">
          <h1 className="title-serif max-w-3xl text-[2rem] leading-[1.25] sm:text-5xl sm:leading-[1.2] xl:text-[3.5rem]">
            전자공학 연구를<br className="hidden sm:block" /> 원문에서 바로 찾습니다
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
            학술대회·논문지 30,000여 편의 원문을 검색하고, 그림·표·수식까지 살펴보세요.
            AI 답변에는 근거 논문과 쪽수가 함께 붙습니다.
          </p>
          <div className="mt-8 max-w-3xl sm:mt-9"><Suspense><SearchBox /></Suspense></div>
          <div className="mt-4 flex max-w-3xl flex-wrap items-center gap-2 text-sm">
            <span className="w-full text-muted sm:w-auto">예시 검색</span>
            {EXAMPLE_QUERIES.map((q) => (
              <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="inline-flex min-h-9 items-center rounded-full border border-line bg-surface/80 px-3 text-ink transition-colors duration-150 hover:border-accent/60 hover:text-accent [@media(pointer:coarse)]:min-h-11">
                {q}
              </Link>
            ))}
          </div>
        </div>
        <SignalTrace className="relative mt-2 h-14 w-full opacity-80 sm:h-20" />
      </section>

      <div className="container-page grid gap-12 py-12 sm:py-14 md:grid-cols-2 md:gap-x-10 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-line">
        <HomeColumn title="최신 등재" className="lg:pr-10">
          <ul className="divide-y divide-line">
            {latest.map((p: any) => (
              <li key={p.id} className="py-3.5 first:pt-0">
                <Link href={`/papers/${p.id}`} className="title-serif line-clamp-2 text-[15px] leading-6 link-quiet">{p.title_ko ?? p.title_en}</Link>
                <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted">
                  <span>{p.venue?.title_ko}</span>
                  {p.published_at && <time dateTime={p.published_at} className="num text-faint">{p.published_at}</time>}
                </p>
              </li>
            ))}
            {latest.length === 0 && <EmptyRow>새로 등재된 논문이 이곳에 표시됩니다.</EmptyRow>}
          </ul>
        </HomeColumn>

        <HomeColumn title="이번 주 많이 읽은 논문" className="lg:px-10">
          <ol className="divide-y divide-line">
            {top.map((p: any, n: number) => (
              <li key={p.id} className="flex gap-4 py-3.5 first:pt-0">
                <span className="num w-5 shrink-0 font-serif text-lg font-semibold leading-6 text-accent">{n + 1}</span>
                <div className="min-w-0">
                  <Link href={`/papers/${p.id}`} className="title-serif line-clamp-2 text-[15px] leading-6 link-quiet">{p.title_ko ?? p.title_en}</Link>
                  <p className="num mt-1 text-xs text-muted">조회 {fmt(p.view_count)} · 인용 {fmt(p.citation_count)}</p>
                </div>
              </li>
            ))}
            {top.length === 0 && <EmptyRow>이용 통계가 쌓이면 순위가 표시됩니다.</EmptyRow>}
          </ol>
        </HomeColumn>

        <HomeColumn title="간행물" href="/venues" className="md:col-span-2 lg:col-span-1 lg:pl-10">
          <ul className="divide-y divide-line md:grid md:grid-cols-2 md:gap-x-10 md:divide-y-0 lg:block lg:divide-y">
            {venues.map((v: any) => (
              <li key={v.slug} className="md:border-b md:border-line lg:border-0">
                <Link href={`/venues/${v.slug}`} className="group flex items-baseline justify-between gap-3 py-3">
                  <span className="text-[15px] font-medium text-ink transition-colors group-hover:text-accent">{v.title_ko}</span>
                  {v.indexing?.length ? <span className="shrink-0 text-xs text-faint">{v.indexing.join('·')}</span> : null}
                </Link>
              </li>
            ))}
            {venues.length === 0 && <EmptyRow>논문지와 학술대회 목록을 준비하고 있습니다.</EmptyRow>}
          </ul>
        </HomeColumn>
      </div>
    </>
  );
}

function HomeColumn({ title, href, className, children }: { title: string; href?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={className}>
      <div className="mb-5 flex items-baseline justify-between border-b-2 border-ink pb-2.5">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {href && <Link href={href} className="text-sm text-muted link-quiet">전체 보기</Link>}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <li className="py-6 text-sm text-muted">{children}</li>;
}
