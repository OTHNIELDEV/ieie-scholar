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
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 grid md:grid-cols-[1fr_16rem] gap-8">
      <div>
        <h1 className="text-2xl font-bold">{author.name_ko ?? author.name_en}</h1>
        <p className="text-gray-500">{author.name_en}{author.org?.name_ko && ` · ${author.org.name_ko}`}
          {author.orcid && <a href={`https://orcid.org/${author.orcid}`} className="ml-2 text-xs text-emerald-600">ORCID {author.orcid}</a>}</p>
        {author.bio && <p className="mt-2 text-sm">{author.bio}</p>}
        <h2 className="mt-8 font-semibold">논문 ({papers.length})</h2>
        <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800 text-sm">
          {papers.sort((a: any, b: any) => (b.published_at ?? '').localeCompare(a.published_at ?? '')).map((p: any) => (
            <li key={p.id} className="py-2"><Link href={`/papers/${p.id}`} className="font-medium hover:text-brand-600">{p.title_ko ?? p.title_en}</Link>
              <p className="text-xs text-gray-500">{p.venue?.title_ko} · {p.published_at?.slice(0, 4)} · 인용 {fmt(p.citation_count)}</p></li>
          ))}
        </ul>
      </div>
      <aside className="text-sm space-y-4">
        <div className="rounded-lg border p-3"><p>논문 <b>{fmt(papers.length)}</b></p><p>h-index <b>{author.h_index ?? '—'}</b></p><p>총 인용 <b>{fmt(papers.reduce((s: number, p: any) => s + (p.citation_count ?? 0), 0))}</b></p></div>
        <div><h3 className="font-semibold mb-1">연도별</h3><ul className="text-xs text-gray-500">{[...years.entries()].sort((a, b) => b[0] - a[0]).map(([y, n]) => <li key={y}>{y} <span className="inline-block bg-brand-500 h-2 ml-1 align-middle" style={{ width: n * 8 }} /> {n}</li>)}</ul></div>
        <button className="btn w-full justify-center">이 프로필이 본인이신가요? 클레임</button>
      </aside>
    </div>
  );
}
