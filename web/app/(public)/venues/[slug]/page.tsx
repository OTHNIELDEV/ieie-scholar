import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVenue } from '@/lib/db/queries';
import { Badge } from '@/components/ui/badge';
export const revalidate = 3600;
export default async function VenuePage({ params }: { params: { slug: string } }) {
  const v = await getVenue(params.slug);
  if (!v) notFound();
  const issues = [...v.issues].sort((a, b) => b.year - a.year || Number(b.number ?? 0) - Number(a.number ?? 0));
  const byYear = new Map<number, typeof issues>();
  issues.forEach((i) => byYear.set(i.year, [...(byYear.get(i.year) ?? []), i]));
  const meta = [v.title_en, v.issn_print && `ISSN ${v.issn_print}`, v.issn_online && `eISSN ${v.issn_online}`].filter(Boolean);
  return (
    <div className="container-page max-w-5xl py-10 sm:py-14">
      <nav aria-label="상위 메뉴" className="text-sm"><Link href="/venues" className="text-muted link-quiet">간행물</Link></nav>
      <header className="mt-3 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          {v.indexing?.map((ix) => <Badge key={ix} tone="blue">{ix}</Badge>)}
          {!v.active && <Badge>종간</Badge>}
        </div>
        <h1 className="title-serif mt-3 text-3xl leading-tight sm:text-4xl">{v.title_ko}</h1>
        {meta.length > 0 && <p className="num mt-2 text-muted">{meta.join(' · ')}</p>}
        {v.description && <p className="mt-5 max-w-measure leading-7 text-ink/85">{v.description}</p>}
      </header>
      <div className="mt-2">
        {[...byYear.entries()].map(([y, is]) => (
          <section key={y} className="grid gap-3 border-b border-line py-6 sm:grid-cols-[7rem_1fr]" aria-labelledby={`y-${y}`}>
            <h2 id={`y-${y}`} className="num font-serif text-2xl font-semibold text-ink">{y}</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap">
              {is.map((i) => (
                <li key={i.id}>
                  <Link href={`/venues/${v.slug}/${i.id}`} className="group flex h-11 items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-3.5 transition-colors duration-150 hover:border-accent sm:h-10 sm:justify-start">
                    <span className="font-medium group-hover:text-accent">{i.title ?? `Vol.${i.volume} No.${i.number}`}</span>
                    <span className="num text-xs text-muted">{i.paper_count}편</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {byYear.size === 0 && <p className="py-12 text-center text-muted">등록된 권호가 아직 없습니다.</p>}
      </div>
    </div>
  );
}
