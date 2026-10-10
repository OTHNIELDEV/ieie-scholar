import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPaper, getReferences, getCitedBy, getSimilar } from '@/lib/db/queries';
import { CitationButton } from '@/components/citation-button';
import { Badge } from '@/components/ui/badge';
import { fmt, siteUrl } from '@/lib/utils';
import { Download, BookOpen, Sparkles, FolderPlus } from 'lucide-react';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await getPaper(params.id);
  if (!p) return {};
  const authors = p.paper_authors.sort((a, b) => a.position - b.position).map((a) => a.raw_name);
  // Google Scholar 인덱싱용 citation_* 메타태그
  const other: Record<string, string | string[]> = {
    citation_title: p.title_ko ?? p.title_en ?? '',
    citation_author: authors,
    citation_publication_date: p.published_at?.replace(/-/g, '/') ?? '',
    citation_journal_title: p.venue.title_ko,
    citation_publisher: '대한전자공학회',
    citation_abstract_html_url: `${siteUrl}/papers/${p.id}`,
  };
  if (p.doi) other.citation_doi = p.doi;
  if (p.page_start) other.citation_firstpage = p.page_start;
  if (p.page_end) other.citation_lastpage = p.page_end;
  if (p.issue?.volume) other.citation_volume = p.issue.volume;
  if (p.issue?.number) other.citation_issue = p.issue.number;
  if (p.venue.issn_print) other.citation_issn = p.venue.issn_print;
  if (p.fulltext_key && p.oa_status !== 'closed') other.citation_pdf_url = `${siteUrl}/api/v1/papers/${p.id}/pdf`;
  return { title: p.title_ko ?? p.title_en ?? '', description: (p.abstract_ko ?? p.abstract_en ?? '').slice(0, 160), other };
}

export default async function PaperPage({ params }: { params: { id: string } }) {
  const p = await getPaper(params.id);
  if (!p) notFound();
  const [refs, citedBy, similar] = await Promise.all([getReferences(p.id), getCitedBy(p.id), getSimilar(p.id).catch(() => [])]);
  const authors = p.paper_authors.sort((a, b) => a.position - b.position);
  const sum = (k: string) => p.summaries?.find((s) => s.kind === k)?.content;
  const isOA = ['diamond', 'gold', 'green'].includes(p.oa_status);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'ScholarlyArticle', headline: p.title_ko ?? p.title_en, datePublished: p.published_at,
    author: authors.map((a) => ({ '@type': 'Person', name: a.raw_name, affiliation: a.raw_affiliation })),
    publisher: { '@type': 'Organization', name: '대한전자공학회' }, isPartOf: { '@type': 'Periodical', name: p.venue.title_ko }, identifier: p.doi ? `https://doi.org/${p.doi}` : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 grid lg:grid-cols-[1fr_18rem] gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article>
        <p className="text-sm text-gray-500"><Link href={`/venues/${p.venue.slug}`} className="hover:text-brand-600">{p.venue.title_ko}</Link>
          {p.issue && <> · <Link href={`/venues/${p.venue.slug}/${p.issue.id}`} className="hover:text-brand-600">{p.issue.title ?? `${p.issue.year}년 ${p.issue.volume ?? ''}권 ${p.issue.number ?? ''}호`}</Link></>}
          {p.page_start && <> · pp. {p.page_start}–{p.page_end}</>}</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug">{p.title_ko ?? p.title_en}</h1>
        {p.title_ko && p.title_en && <p className="text-gray-500 mt-1">{p.title_en}</p>}
        <p className="mt-3 text-sm">
          {authors.map((a, i) => (
            <span key={i}>{a.author ? <Link href={`/authors/${a.author.id}`} className="hover:text-brand-600 font-medium">{a.raw_name}</Link> : a.raw_name}
              {a.is_corresponding && <sup>*</sup>}{a.raw_affiliation && <span className="text-gray-400"> ({a.raw_affiliation})</span>}{i < authors.length - 1 && ', '}</span>
          ))}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {isOA && <Badge tone="green">Open Access</Badge>}
          {p.award && <Badge tone="amber">{p.award}</Badge>}
          {p.session && <Badge tone="blue">세션 {p.session.code ?? ''} {p.session.title}</Badge>}
          {p.doi && <a href={`https://doi.org/${p.doi}`} className="text-xs text-gray-500 hover:underline">doi:{p.doi}</a>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={`/api/v1/papers/${p.id}/pdf`} className="btn-primary"><BookOpen className="w-4 h-4" /> 원문 보기</a>
          <a href={`/api/v1/papers/${p.id}/pdf?download=1`} className="btn"><Download className="w-4 h-4" /> PDF</a>
          <CitationButton title={p.title_ko ?? p.title_en ?? ''} authors={authors.map((a) => a.raw_name)} venue={p.venue.title_ko}
            year={p.published_at ? Number(p.published_at.slice(0, 4)) : undefined} pages={p.page_start ? `${p.page_start}-${p.page_end}` : undefined} doi={p.doi} url={`${siteUrl}/papers/${p.id}`} />
          <button className="btn"><FolderPlus className="w-4 h-4" /> 내 서재</button>
          <Link href={`/ai?paper=${p.id}`} className="btn text-brand-600"><Sparkles className="w-4 h-4" /> AI 워크스페이스</Link>
        </div>

        {sum('one_line') && <div className="mt-6 rounded-lg bg-brand-50 dark:bg-brand-900/20 p-4 text-sm"><span className="font-semibold text-brand-700 dark:text-brand-100">AI 한 줄 요약</span> · {sum('one_line')}</div>}

        <Section title="초록">
          <p className="prose-paper whitespace-pre-line text-sm">{p.abstract_ko ?? p.abstract_en ?? <span className="text-gray-400">초록 없음</span>}</p>
          {(p.keywords_ko ?? p.keywords_en)?.length ? <p className="mt-3 flex flex-wrap gap-1">{(p.keywords_ko ?? p.keywords_en)!.map((k) => <Link key={k} href={`/search?q=${encodeURIComponent(k)}`}><Badge>{k}</Badge></Link>)}</p> : null}
        </Section>

        {sum('method') && <Section title="연구 방법 요약 (AI)"><p className="text-sm whitespace-pre-line">{sum('method')}</p></Section>}

        {p.figures?.length > 0 && (
          <Section title={`그림 · 표 · 수식 (${p.figures.length})`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {p.figures.map((f: any) => (
                <figure key={f.id} className="text-xs border rounded p-2">
                  {f.image_key && <img src={`${process.env.R2_PUBLIC_BASE}/${f.image_key}`} alt={f.label} className="w-full h-28 object-contain bg-white" loading="lazy" />}
                  <figcaption className="mt-1 line-clamp-2"><b>{f.label}</b> {f.caption} <span className="text-gray-400">p.{f.page}</span></figcaption>
                </figure>
              ))}
            </div>
          </Section>
        )}

        <Section title={`참고문헌 (${refs.length})`}>
          <ol className="text-sm space-y-1 list-decimal pl-5">
            {refs.map((r: any) => <li key={r.position}>{r.matched_paper_id ? <Link href={`/papers/${r.matched_paper_id}`} className="hover:text-brand-600">{r.raw_text}</Link> : r.raw_text}
              {r.matched_doi && <a className="ml-1 text-xs text-gray-400" href={`https://doi.org/${r.matched_doi}`}>doi</a>}</li>)}
          </ol>
        </Section>

        <Section title={`피인용 (${fmt(p.citation_count)})`}>
          <ul className="text-sm space-y-2">
            {citedBy.map((c: any, i: number) => <li key={i}>
              {c.citing ? <Link href={`/papers/${c.citing.id}`} className="hover:text-brand-600">{c.citing.title_ko ?? c.citing.title_en}</Link> : <a href={`https://doi.org/${c.citing_doi}`}>{c.citing_doi}</a>}
              <Badge className="ml-2">{c.source}</Badge>
              {c.context && <p className="text-xs text-gray-500 italic mt-0.5">“{c.context}”</p>}</li>)}
          </ul>
        </Section>
      </article>

      <aside className="text-sm space-y-6">
        <div><h3 className="font-semibold mb-2">지표</h3><p className="text-gray-600 dark:text-gray-400">조회 {fmt(p.view_count)} · 다운로드 {fmt(p.download_count)} · 인용 {fmt(p.citation_count)}</p></div>
        {p.links?.length > 0 && <div><h3 className="font-semibold mb-2">코드 · 데이터셋 · 자료</h3><ul className="space-y-1">{p.links.map((l: any, i: number) => <li key={i}><a href={l.url} className="text-brand-600 break-all" target="_blank" rel="noopener">[{l.link_type}] {l.url}</a></li>)}</ul></div>}
        <div><h3 className="font-semibold mb-2">유사 논문</h3><ul className="space-y-2">{similar.map((s) => <li key={s.id}><Link href={`/papers/${s.id}`} className="hover:text-brand-600 line-clamp-2">{s.title_ko ?? s.title_en}</Link></li>)}</ul></div>
      </aside>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><h2 className="font-semibold text-lg mb-2">{title}</h2>{children}</section>;
}
