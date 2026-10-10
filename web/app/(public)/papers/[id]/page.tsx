import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPaper, getReferences, getCitedBy, getSimilar } from '@/lib/db/queries';
import { CitationButton } from '@/components/citation-button';
import { Badge } from '@/components/ui/badge';
import { fmt, siteUrl } from '@/lib/utils';
import { Award, BookOpen, ChevronRight, Download, ExternalLink, FolderPlus, Sparkles } from 'lucide-react';

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
    <div className="container-page grid gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="min-w-0">
        <nav aria-label="수록 정보" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
          <Link href={`/venues/${p.venue.slug}`} className="font-medium text-accent hover:underline underline-offset-4">{p.venue.title_ko}</Link>
          {p.issue && <><ChevronRight className="h-3.5 w-3.5 text-faint" aria-hidden="true" /><Link href={`/venues/${p.venue.slug}/${p.issue.id}`} className="link-quiet">{p.issue.title ?? `${p.issue.year}년 ${p.issue.volume ?? ''}권 ${p.issue.number ?? ''}호`}</Link></>}
          {p.page_start && <span className="num text-faint">· pp. {p.page_start}–{p.page_end}</span>}
        </nav>

        <h1 className="title-serif mt-4 text-[1.65rem] leading-[1.35] sm:text-[2.1rem]">{p.title_ko ?? p.title_en}</h1>
        {p.title_ko && p.title_en && <p className="mt-2 text-base leading-7 text-muted sm:text-lg">{p.title_en}</p>}

        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[15px]">
          {authors.map((a, i) => (
            <li key={i}>
              {a.author ? <Link href={`/authors/${a.author.id}`} className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:text-accent hover:decoration-accent">{a.raw_name}</Link> : <span className="font-medium">{a.raw_name}</span>}
              {a.is_corresponding && <sup className="ml-0.5 text-accent" title="교신저자">*</sup>}
              {a.raw_affiliation && <span className="text-sm text-muted"> {a.raw_affiliation}</span>}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {isOA && <Badge tone="green">Open Access</Badge>}
          {p.award && <Badge tone="amber"><Award className="h-3 w-3" aria-hidden="true" />{p.award}</Badge>}
          {p.session && <Badge tone="blue">세션 {p.session.code ?? ''} {p.session.title}</Badge>}
          {p.doi && <a href={`https://doi.org/${p.doi}`} className="num ml-1 text-xs text-muted link-quiet">doi:{p.doi}</a>}
        </div>

        <div className="no-print mt-6 grid grid-cols-2 gap-2 border-y border-line py-4 sm:flex sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto [&_.btn]:w-full sm:[&_.btn]:w-auto">
          <a href={`/api/v1/papers/${p.id}/pdf`} className="btn-primary"><BookOpen className="h-4 w-4" aria-hidden="true" /> 원문 보기</a>
          <a href={`/api/v1/papers/${p.id}/pdf?download=1`} className="btn"><Download className="h-4 w-4" aria-hidden="true" /> PDF 내려받기</a>
          <CitationButton title={p.title_ko ?? p.title_en ?? ''} authors={authors.map((a) => a.raw_name)} venue={p.venue.title_ko}
            year={p.published_at ? Number(p.published_at.slice(0, 4)) : undefined} pages={p.page_start ? `${p.page_start}-${p.page_end}` : undefined} doi={p.doi} url={`${siteUrl}/papers/${p.id}`} />
          <button className="btn"><FolderPlus className="h-4 w-4" aria-hidden="true" /> 내 서재에 담기</button>
          <Link href={`/ai?paper=${p.id}`} className="btn col-span-2 border-signal/50 text-signal hover:border-signal hover:bg-signal/5"><Sparkles className="h-4 w-4" aria-hidden="true" /> 이 논문에 질문하기</Link>
        </div>

        {sum('one_line') && (
          <div className="mt-8 border-l-2 border-signal bg-signal/[0.06] px-4 py-4 sm:px-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-signal"><Sparkles className="h-4 w-4" aria-hidden="true" /> AI 한 줄 요약</p>
            <p className="mt-1.5 text-[15px] leading-7">{sum('one_line')}</p>
          </div>
        )}

        <Section title="초록">
          <p className="prose-paper max-w-measure whitespace-pre-line text-[15px] sm:text-base">{p.abstract_ko ?? p.abstract_en ?? <span className="text-muted">이 논문은 초록을 제공하지 않습니다.</span>}</p>
          {(p.keywords_ko ?? p.keywords_en)?.length ? (
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="키워드">
              {(p.keywords_ko ?? p.keywords_en)!.map((k) => (
                <li key={k}><Link href={`/search?q=${encodeURIComponent(k)}`} className="inline-flex min-h-8 items-center rounded-full border border-line-strong px-3 text-sm text-muted transition-colors duration-150 hover:border-accent hover:text-accent [@media(pointer:coarse)]:min-h-10">{k}</Link></li>
              ))}
            </ul>
          ) : null}
        </Section>

        {sum('method') && <Section title="연구 방법 요약" note="AI 생성"><p className="prose-paper max-w-measure whitespace-pre-line text-[15px]">{sum('method')}</p></Section>}

        {p.figures?.length > 0 && (
          <Section title="그림 · 표 · 수식" count={p.figures.length}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {p.figures.map((f: any) => (
                <figure key={f.id} className="overflow-hidden rounded-md border border-line bg-surface text-xs">
                  {/* 원문에서 추출한 그림은 흰 바탕이므로 다크 모드에서도 흰 배경을 유지한다 */}
                  {f.image_key && <img src={`${process.env.R2_PUBLIC_BASE}/${f.image_key}`} alt={`${f.label} ${f.caption ?? ''}`.trim()} width={320} height={160} className="h-32 w-full border-b border-line bg-white object-contain p-2" loading="lazy" />}
                  <figcaption className="line-clamp-3 p-2.5 leading-5 text-muted"><b className="text-ink">{f.label}</b> {f.caption} <span className="num text-faint">p.{f.page}</span></figcaption>
                </figure>
              ))}
            </div>
          </Section>
        )}

        <Section title="참고문헌" count={refs.length}>
          {refs.length ? (
            <ol className="space-y-2.5 text-sm leading-6">
              {refs.map((r: any) => (
                <li key={r.position} className="grid grid-cols-[2.25rem_1fr]">
                  <span className="num text-faint">[{r.position}]</span>
                  <span className="text-ink/85">
                    {r.matched_paper_id ? <Link href={`/papers/${r.matched_paper_id}`} className="link">{r.raw_text}</Link> : r.raw_text}
                    {r.matched_doi && <a className="ml-1.5 text-xs text-muted link-quiet" href={`https://doi.org/${r.matched_doi}`}>DOI</a>}
                  </span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted">추출된 참고문헌이 없습니다.</p>}
        </Section>

        <Section title="이 논문을 인용한 논문" count={p.citation_count}>
          {citedBy.length ? (
            <ul className="divide-y divide-line text-sm">
              {citedBy.map((c: any, i: number) => (
                <li key={i} className="py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {c.citing ? <Link href={`/papers/${c.citing.id}`} className="title-serif text-[15px] link-quiet">{c.citing.title_ko ?? c.citing.title_en}</Link> : <a href={`https://doi.org/${c.citing_doi}`} className="link">{c.citing_doi}</a>}
                    <Badge>{c.source}</Badge>
                  </div>
                  {c.context && <p className="mt-1.5 border-l-2 border-line-strong pl-3 text-[13px] leading-6 text-muted">“{c.context}”</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">아직 확인된 피인용 논문이 없습니다.</p>}
        </Section>
      </article>

      <aside className="space-y-8 text-sm md:grid md:grid-cols-2 md:gap-8 md:space-y-0 lg:sticky lg:top-24 lg:block lg:space-y-8 lg:self-start">
        <div className="self-start rounded-lg border border-line bg-surface p-5">
          <h2 className="section-title">이용 지표</h2>
          <dl className="mt-3 grid grid-cols-3 divide-x divide-line text-center">
            {[['조회', p.view_count], ['다운로드', p.download_count], ['인용', p.citation_count]].map(([label, n]) => (
              <div key={label as string} className="px-1">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="num mt-1 text-xl font-semibold text-ink">{fmt(n as number)}</dd>
              </div>
            ))}
          </dl>
        </div>
        {p.links?.length > 0 && (
          <div>
            <h2 className="section-title mb-3">코드 · 데이터셋 · 자료</h2>
            <ul className="space-y-2">{p.links.map((l: any, i: number) => (
              <li key={i}><a href={l.url} className="group flex items-start gap-2 break-all text-accent" target="_blank" rel="noopener">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span><span className="text-muted">{l.link_type}</span> <span className="group-hover:underline underline-offset-4">{l.url}</span></span></a></li>
            ))}</ul>
          </div>
        )}
        <div className="md:col-span-2 lg:col-span-1">
          <h2 className="section-title mb-1">유사 논문</h2>
          {similar.length ? (
            <ul className="divide-y divide-line">{similar.map((s) => (
              <li key={s.id} className="py-3"><Link href={`/papers/${s.id}`} className="title-serif line-clamp-2 text-[14px] leading-6 link-quiet">{s.title_ko ?? s.title_en}</Link></li>
            ))}</ul>
          ) : <p className="mt-2 text-muted">유사 논문을 계산하고 있습니다.</p>}
        </div>
      </aside>
    </div>
  );
}
function Section({ title, count, note, children }: { title: string; count?: number; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 flex items-baseline gap-2 border-b border-line pb-2 text-lg font-bold text-ink">
        {title}
        {count !== undefined && <span className="num text-sm font-normal text-muted">{fmt(count)}</span>}
        {note && <span className="ml-auto text-xs font-normal text-signal">{note}</span>}
      </h2>
      {children}
    </section>
  );
}
