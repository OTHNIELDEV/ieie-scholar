import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-gray-500"><Link href={`/venues/${params.slug}`} className="hover:text-brand-600">{(issue as any).venue?.title_ko}</Link></p>
      <h1 className="text-2xl font-bold">{issue.title ?? `${issue.year}년 Vol.${issue.volume} No.${issue.number}`}</h1>
      <p className="text-gray-500 text-sm">{issue.event_start && `${issue.event_start} ~ ${issue.event_end}`}{issue.location && ` · ${issue.location}`} · 논문 {papers.length}편{isConf && ` · 세션 ${sessions.length}개`}</p>
      {isConf && sessions.length > 0 && (
        <nav className="mt-4 flex flex-wrap gap-1 text-xs">{sessions.map((s: any) => <a key={s.id} href={`#s${s.id}`} className="btn !py-0.5">{s.code ?? s.title}</a>)}</nav>
      )}
      <div className="mt-6 space-y-8">
        {(sessions.length ? sessions : [null]).map((s: any) => {
          const list = bySession.get(s?.id ?? null) ?? [];
          if (!list.length && s) return null;
          return (
            <section key={s?.id ?? 'none'} id={s ? `s${s.id}` : undefined}>
              {s && <h2 className="font-semibold flex items-center gap-2">{s.code && <Badge tone="blue">{s.code}</Badge>} {s.title}
                <span className="text-xs text-gray-400 font-normal">{s.track}{s.chair && ` · 좌장 ${s.chair}`}{s.room && ` · ${s.room}`}{s.type && ` · ${s.type}`}</span></h2>}
              <ol className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
                {list.map((p: any) => (
                  <li key={p.id} className="py-2 text-sm flex gap-3"><span className="text-gray-400 w-16 shrink-0">{p.page_start && `p.${p.page_start}`}</span>
                    <div><Link href={`/papers/${p.id}`} className="font-medium hover:text-brand-600">{p.title_ko ?? p.title_en}</Link>
                      <p className="text-gray-500 text-xs">{p.paper_authors?.sort((a: any, b: any) => a.position - b.position).map((a: any) => a.raw_name).join(', ')}</p>
                      <div className="flex gap-1 mt-0.5">{p.award && <Badge tone="amber">{p.award}</Badge>}{p.presentation === 'poster' && <Badge>포스터</Badge>}</div></div></li>
                ))}
              </ol>
            </section>
          );
        })}
        {!sessions.length && bySession.get(null)?.length === 0 && <p className="text-gray-400">논문이 없습니다.</p>}
      </div>
    </div>
  );
}
