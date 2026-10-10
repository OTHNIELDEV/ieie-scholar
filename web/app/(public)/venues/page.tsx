import Link from 'next/link';
import { supabaseAdmin } from '@/lib/db/server';
export const revalidate = 3600;
const LABEL: Record<string, string> = { journal: '논문지', journal_legacy: '구 분과 논문지', conference_domestic: '국내 학술대회', conference_intl: '국제 학술대회', magazine: '회지·잡지', education: '강좌·포럼', report: '보고서' };
export default async function Venues({ searchParams }: { searchParams: { type?: string } }) {
  const { data } = await supabaseAdmin().from('venues').select('slug, title_ko, title_en, venue_type, indexing, active').order('venue_type').order('title_ko');
  const groups = new Map<string, any[]>();
  (data ?? []).filter((v) => !searchParams.type || v.venue_type.startsWith(searchParams.type)).forEach((v) => groups.set(v.venue_type, [...(groups.get(v.venue_type) ?? []), v]));
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">간행물</h1>
      {[...groups.entries()].map(([t, vs]) => (
        <section key={t} className="mb-8"><h2 className="font-semibold mb-2">{LABEL[t] ?? t}</h2>
          <ul className="grid sm:grid-cols-2 gap-1 text-sm">{vs.map((v) => <li key={v.slug}><Link href={`/venues/${v.slug}`} className="hover:text-brand-600">{v.title_ko}</Link>
            {v.indexing?.length ? <span className="ml-2 text-xs text-gray-400">{v.indexing.join('·')}</span> : null}{!v.active && <span className="ml-2 text-xs text-gray-400">(종간)</span>}</li>)}</ul></section>
      ))}
      {groups.size === 0 && <p className="text-gray-400">간행물 데이터가 없습니다. <code>pipeline/seed_venues.py</code> 를 실행하세요.</p>}
    </div>
  );
}
