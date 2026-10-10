import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAuthor } from '@/lib/db/queries';
import { fmt } from '@/lib/utils';
export const revalidate = 3600;
export default async function AuthorPage({ params }: { params: { id: string } }) {
  const d = await getAuthor(params.id);
  if (!d) notFound();
  const { author, papers } = d;
  const years = new Map<number, number>();
  papers.forEach((p: any) => { const y = Number((p.published_at ?? '').slice(0, 4)); if (y) years.set(y, (years.get(y) ?? 0) + 1); });
  const yearRows = [...years.entries()].sort((a, b) => b[0] - a[0]);
  const maxPerYear = Math.max(1, ...years.values());
  const totalCited = papers.reduce((s: number, p: any) => s + (p.citation_count ?? 0), 0);
  const name = author.name_ko ?? author.name_en ?? '';
  return (
    <div className="container-page max-w-6xl py-10 sm:py-14">
      <header className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 font-serif text-2xl font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-400/10 dark:text-brand-200 dark:ring-brand-400/20" aria-hidden="true">
          {name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <h1 className="title-serif text-3xl sm:text-4xl">{name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            {author.name_ko && author.name_en && <span>{author.name_en}</span>}
            {author.org?.name_ko && <span>{author.org.name_ko}</span>}
            {author.orcid && <a href={`https://orcid.org/${author.orcid}`} className="num inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline underline-offset-4 dark:text-emerald-400">ORCID {author.orcid}</a>}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-14">
        {/* 모바일에서는 지표를 먼저 보여 준다 */}
        <aside className="order-first space-y-8 text-sm sm:grid sm:grid-cols-2 sm:gap-8 sm:space-y-0 lg:order-last lg:sticky lg:top-24 lg:block lg:space-y-8 lg:self-start">
          <dl className="grid grid-cols-3 divide-x divide-line self-start rounded-lg border border-line bg-surface py-4 text-center">
            {[['논문', fmt(papers.length)], ['h-index', author.h_index ?? '—'], ['총 인용', fmt(totalCited)]].map(([label, value]) => (
              <div key={label as string} className="px-1">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="num mt-1 text-xl font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {yearRows.length > 0 && (
            <div>
              <h3 className="section-title mb-3">연도별 논문 수</h3>
              <ul className="space-y-1.5">
                {yearRows.map(([y, n]) => (
                  <li key={y} className="num grid grid-cols-[2.75rem_1fr_1.5rem] items-center gap-2 text-xs">
                    <span className="text-muted">{y}</span>
                    <span className="h-2 rounded-sm bg-sunken"><span className="block h-2 rounded-sm bg-accent" style={{ width: `${(n / maxPerYear) * 100}%` }} /></span>
                    <span className="text-right font-medium text-ink">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button className="btn w-full sm:col-span-2 lg:col-span-1">본인 프로필로 등록하기</button>
        </aside>

        <section aria-labelledby="author-papers" className="min-w-0">
          {author.bio && <p className="mb-8 max-w-measure leading-7 text-ink/85">{author.bio}</p>}
          <h2 id="author-papers" className="flex items-baseline gap-2 border-b-2 border-ink pb-2 text-lg font-bold">논문 <span className="num text-sm font-normal text-muted">{fmt(papers.length)}</span></h2>
          <ul className="divide-y divide-line">
            {papers.sort((a: any, b: any) => (b.published_at ?? '').localeCompare(a.published_at ?? '')).map((p: any) => (
              <li key={p.id} className="py-4">
                <Link href={`/papers/${p.id}`} className="title-serif text-[16px] leading-7 link-quiet">{p.title_ko ?? p.title_en}</Link>
                <p className="num mt-1 text-xs text-muted">{p.venue?.title_ko} · {p.published_at?.slice(0, 4)} · 인용 {fmt(p.citation_count)}</p>
              </li>
            ))}
            {papers.length === 0 && <li className="py-10 text-muted">연결된 논문이 아직 없습니다.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
