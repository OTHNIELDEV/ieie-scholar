import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import { getIssueWithSessions } from '@/lib/db/queries';
import { Badge } from '@/components/ui/badge';
export const revalidate = 3600;

/** 권호/학술대회 상세 — 세션 트리 (DBpia에 없는 구조) */
export default async function IssuePage({ params }: { params: { slug: string; issue: string } }) {
  const d = await getIssueWithSessions(Number(params.issue));
  if (!d) notFound();
  const { issue, sessions, papers } = d;
  const bySession = new Map<number | null, typeof papers>();
  papers.forEach((p: any) => bySession.set(p.session_id, [...(bySession.get(p.session_id) ?? []), p]));
  const isConf = (issue as any).venue?.venue_type?.startsWith('conference');
  return (
    <div className="container-page max-w-5xl py-10 sm:py-14">
      <nav aria-label="상위 메뉴" className="text-sm">
        <Link href={`/venues/${params.slug}`} className="font-medium text-accent hover:underline underline-offset-4">{(issue as any).venue?.title_ko}</Link>
      </nav>
      <header className="mt-3 border-b border-line pb-8">
        <h1 className="title-serif text-3xl leading-tight sm:text-4xl">{issue.title ?? `${issue.year}년 Vol.${issue.volume} No.${issue.number}`}</h1>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          {issue.event_start && <span className="num inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-faint" aria-hidden="true" />{issue.event_start} – {issue.event_end}</span>}
          {issue.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-faint" aria-hidden="true" />{issue.location}</span>}
          <span className="num">논문 <b className="font-semibold text-ink">{papers.length}</b>편{isConf && <> · 세션 <b className="font-semibold text-ink">{sessions.length}</b>개</>}</span>
        </div>
        {isConf && sessions.length > 0 && (
          <nav aria-label="세션 바로가기" className="mt-6 flex flex-wrap gap-1.5">
            {sessions.map((s: any) => (
              <a key={s.id} href={`#s${s.id}`} className="num inline-flex min-h-8 items-center rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-muted transition-colors duration-150 hover:border-accent hover:text-accent [@media(pointer:coarse)]:min-h-10">{s.code ?? s.title}</a>
            ))}
          </nav>
        )}
      </header>

      <div className="relative mt-10 space-y-12">
        {sessions.length > 0 && <div className="absolute bottom-0 left-[5px] top-2 w-px bg-line-strong" aria-hidden="true" />}
        {(sessions.length ? sessions : [null]).map((s: any) => {
          const list = bySession.get(s?.id ?? null) ?? [];
          if (!list.length && s) return null;
          return (
            <section key={s?.id ?? 'none'} id={s ? `s${s.id}` : undefined} className={s ? 'relative scroll-mt-24 pl-6 sm:pl-8' : ''}>
              {s && (
                <>
                  <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-accent bg-paper" aria-hidden="true" />
                  <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                    {s.code && <Badge tone="blue" className="num">{s.code}</Badge>}{s.title}
                  </h2>
                  {(s.track || s.chair || s.room || s.type) && (
                    <p className="mt-1 text-sm text-muted">{[s.track, s.chair && `좌장 ${s.chair}`, s.room, s.type].filter(Boolean).join(' · ')}</p>
                  )}
                </>
              )}
              <ol className="mt-3 divide-y divide-line border-y border-line">
                {list.map((p: any) => (
                  <li key={p.id} className="grid grid-cols-[2.75rem_1fr] gap-2 py-3.5 text-sm sm:grid-cols-[3.5rem_1fr] sm:gap-3">
                    <span className="num pt-0.5 text-xs text-faint">{p.page_start && `p.${p.page_start}`}</span>
                    <div className="min-w-0">
                      <Link href={`/papers/${p.id}`} className="title-serif text-[15px] leading-6 link-quiet">{p.title_ko ?? p.title_en}</Link>
                      <p className="mt-1 text-xs text-muted">{p.paper_authors?.sort((a: any, b: any) => a.position - b.position).map((a: any) => a.raw_name).join(', ')}</p>
                      {(p.award || p.presentation === 'poster') && (
                        <div className="mt-1.5 flex gap-1">{p.award && <Badge tone="amber">{p.award}</Badge>}{p.presentation === 'poster' && <Badge>포스터</Badge>}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
        {!sessions.length && bySession.get(null)?.length === 0 && <p className="text-muted">이 권호에 등록된 논문이 아직 없습니다.</p>}
      </div>
    </div>
  );
}
