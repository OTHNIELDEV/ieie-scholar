import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVenue } from '@/lib/db/queries';
export const revalidate = 3600;
export default async function VenuePage({ params }: { params: { slug: string } }) {
  const v = await getVenue(params.slug);
  if (!v) notFound();
  const issues = [...v.issues].sort((a, b) => b.year - a.year || Number(b.number ?? 0) - Number(a.number ?? 0));
  const byYear = new Map<number, typeof issues>();
  issues.forEach((i) => byYear.set(i.year, [...(byYear.get(i.year) ?? []), i]));
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{v.title_ko}</h1>
      <p className="text-gray-500">{v.title_en}{v.issn_print && ` · ISSN ${v.issn_print}`}{v.indexing?.length ? ` · ${v.indexing.join(', ')}` : ''}</p>
      {v.description && <p className="mt-3 text-sm">{v.description}</p>}
      <div className="mt-8 space-y-4">
        {[...byYear.entries()].map(([y, is]) => (
          <div key={y}><h2 className="font-semibold">{y}</h2>
            <ul className="mt-1 flex flex-wrap gap-2 text-sm">{is.map((i) => <li key={i.id}><Link href={`/venues/${v.slug}/${i.id}`} className="btn">{i.title ?? `Vol.${i.volume} No.${i.number}`} <span className="text-gray-400">({i.paper_count})</span></Link></li>)}</ul></div>
        ))}
      </div>
    </div>
  );
}
