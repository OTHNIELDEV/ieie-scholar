import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { getHomeData } from '@/lib/db/queries';
import { fmt } from '@/lib/utils';

export const revalidate = 600;

export default async function Home() {
  const { latest, top, venues } = await getHomeData().catch(() => ({ latest: [], top: [], venues: [] }));
  return (
    <div className="mx-auto max-w-7xl px-4">
      <section className="py-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold">전자공학 연구의 시작, <span className="text-brand-600">IEIE Scholar</span></h1>
        <p className="mt-3 text-gray-500">대한전자공학회 학술대회·논문지 30,000+편 · 원문 기반 AI 검색 · 그림/표/수식 탐색</p>
        <div className="mt-8 max-w-2xl mx-auto"><Suspense><SearchBox /></Suspense></div>
      </section>
      <section className="grid md:grid-cols-3 gap-8">
        <List title="최신 등재" items={latest.map((p: any) => ({ id: p.id, t: p.title_ko ?? p.title_en, s: `${p.venue?.title_ko ?? ''} · ${p.published_at ?? ''}` }))} />
        <List title="이번 주 BEST" items={top.map((p: any) => ({ id: p.id, t: p.title_ko ?? p.title_en, s: `조회 ${fmt(p.view_count)} · 인용 ${fmt(p.citation_count)}` }))} />
        <div>
          <h2 className="font-semibold mb-3">간행물</h2>
          <ul className="space-y-1 text-sm">
            {venues.map((v: any) => (
              <li key={v.slug}><Link href={`/venues/${v.slug}`} className="hover:text-brand-600">{v.title_ko}</Link>
                {v.indexing?.length ? <span className="ml-2 text-xs text-gray-400">{v.indexing.join('·')}</span> : null}</li>
            ))}
            {venues.length === 0 && <li className="text-gray-400">데이터가 아직 적재되지 않았습니다. pipeline/ 을 실행하세요.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}

function List({ title, items }: { title: string; items: { id: number; t: string; s: string }[] }) {
  return (
    <div>
      <h2 className="font-semibold mb-3">{title}</h2>
      <ol className="space-y-2 text-sm">
        {items.map((i, n) => (
          <li key={i.id} className="flex gap-2"><span className="text-gray-400 w-4">{n + 1}</span>
            <div><Link href={`/papers/${i.id}`} className="hover:text-brand-600 line-clamp-1">{i.t}</Link><p className="text-xs text-gray-400">{i.s}</p></div></li>
        ))}
      </ol>
    </div>
  );
}
