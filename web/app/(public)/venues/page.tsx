import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { supabaseAdmin } from '@/lib/db/server';
import { Badge } from '@/components/ui/badge';
export const revalidate = 3600;
const LABEL: Record<string, string> = { journal: '논문지', journal_legacy: '구 분과 논문지', conference_domestic: '국내 학술대회', conference_intl: '국제 학술대회', magazine: '회지·잡지', education: '강좌·포럼', report: '보고서' };
export default async function Venues({ searchParams }: { searchParams: { type?: string } }) {
  const { data } = await supabaseAdmin().from('venues').select('slug, title_ko, title_en, venue_type, indexing, active').order('venue_type').order('title_ko');
  const groups = new Map<string, any[]>();
  (data ?? []).filter((v) => !searchParams.type || v.venue_type.startsWith(searchParams.type)).forEach((v) => groups.set(v.venue_type, [...(groups.get(v.venue_type) ?? []), v]));
  const title = searchParams.type === 'conference' ? '학술대회' : '간행물';
  return (
    <div className="container-page max-w-5xl py-10 sm:py-14">
      <h1 className="title-serif text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-xl text-muted">대한전자공학회가 발행하는 논문지와 개최하는 학술대회를 유형별로 모았습니다.</p>
      <div className="mt-10 space-y-12">
        {[...groups.entries()].map(([t, vs]) => (
          <section key={t} aria-labelledby={`g-${t}`}>
            <h2 id={`g-${t}`} className="flex items-baseline gap-2 border-b-2 border-ink pb-2 text-lg font-bold">
              {LABEL[t] ?? t}<span className="num text-sm font-normal text-muted">{vs.length}</span>
            </h2>
            <ul className="grid sm:grid-cols-2 sm:gap-x-10">
              {vs.map((v) => (
                <li key={v.slug} className="border-b border-line">
                  <Link href={`/venues/${v.slug}`} className="group flex min-h-14 items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className={v.active ? 'font-medium text-ink group-hover:text-accent' : 'font-medium text-muted group-hover:text-accent'}>{v.title_ko}</span>
                      {v.title_en && <span className="mt-0.5 block truncate text-xs text-faint">{v.title_en}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {v.indexing?.length ? <Badge tone="blue">{v.indexing.join('·')}</Badge> : null}
                      {!v.active && <Badge>종간</Badge>}
                      <ChevronRight className="h-4 w-4 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {groups.size === 0 && <p className="mt-10 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center text-muted">등록된 간행물이 아직 없습니다. 간행물 정보가 등록되면 이곳에 표시됩니다.</p>}
    </div>
  );
}
