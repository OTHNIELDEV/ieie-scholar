'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ChevronDown, Loader2, Sparkles } from 'lucide-react';

const EXAMPLES = [
  '28nm CMOS 저잡음 증폭기의 잡음지수를 낮추는 기법은?',
  '최근 5년간 학회에 발표된 GaN 전력 변환기 효율 개선 연구를 정리해 줘',
  '경량 객체 검출 모델을 엣지 NPU에 올릴 때 쓰는 양자화 방법은?',
];

type Msg = { role: 'user' | 'assistant'; content: string };
type Cite = { n: number; paper_id: number; page: number | null; title: string; year: number | null; venue: string | null };

/** 간단한 스트리밍 클라이언트 (Vercel AI SDK data stream 프로토콜 파싱) */
export function AiChat({ initialQ, paperId }: { initialQ?: string; paperId?: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [cites, setCites] = useState<Cite[]>([]);
  const [input, setInput] = useState(initialQ ?? '');
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  async function ask(q: string) {
    if (!q.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: q }];
    setMsgs([...next, { role: 'assistant', content: '' }]);
    setInput(''); setBusy(true);
    try {
      const res = await fetch('/api/ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, paperId }) });
      if (!res.ok || !res.body) throw new Error(`AI 응답 실패 (HTTP ${res.status})`);
      const c = res.headers.get('x-citations');
      if (c) setCites(JSON.parse(decodeURIComponent(c)));
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = '';
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('0:')) { acc += JSON.parse(line.slice(2)); setMsgs([...next, { role: 'assistant', content: acc }]); }
        }
      }
    } catch (err) {
      console.error(err);
      setMsgs([...next, { role: 'assistant', content: '답변을 받지 못했습니다. 잠시 후 다시 질문하거나, 문제가 계속되면 관리자에게 문의해 주세요.' }]);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { if (initialQ && !started.current) { started.current = true; ask(initialQ); } }, []); // eslint-disable-line

  const render = (t: string) => t.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/); if (!m) return <span key={i}>{part}</span>;
    const c = cites.find((x) => x.n === Number(m[1]));
    return c
      ? <Link key={i} href={`/papers/${c.paper_id}`} title={`${c.title} (${c.year}) p.${c.page ?? '?'}`} className="num mx-0.5 rounded bg-signal/10 px-1 text-[0.8em] font-semibold text-signal no-underline hover:bg-signal/20">{c.n}</Link>
      : <span key={i}>{part}</span>;
  });

  return (
    <div className="mt-8">
      {msgs.length === 0 && (
        <div className="rounded-lg border border-dashed border-line-strong px-3 py-6 sm:px-5 sm:py-8">
          <p className="px-2 font-medium text-ink">이런 질문을 해 보세요</p>
          <ul className="mt-3 space-y-1">
            {EXAMPLES.map((q) => (
              <li key={q}>
                <button type="button" onClick={() => ask(q)} className="flex min-h-11 w-full items-start gap-2 rounded-md px-2 py-2 text-left text-[15px] text-muted transition-colors duration-150 hover:bg-sunken hover:text-ink">
                  <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-signal" aria-hidden="true" />{q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-6" aria-live="polite" aria-busy={busy}>
        {msgs.map((m, i) => m.role === 'user' ? (
          <div key={i} className="flex justify-end">
            <p className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[15px] leading-7 text-white sm:max-w-[85%]">{m.content}</p>
          </div>
        ) : (
          <div key={i} className="flex gap-3">
            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal/10 text-signal" aria-hidden="true"><Sparkles className="h-3.5 w-3.5" /></span>
            <div className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-[1.85] text-ink">
              {render(m.content)}
              {busy && i === msgs.length - 1 && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-signal align-middle" aria-label="답변 작성 중" />}
            </div>
          </div>
        ))}
      </div>
      {cites.length > 0 && (
        <details className="group mt-8 rounded-lg border border-line bg-surface" open>
          <summary className="flex h-11 items-center gap-2 px-4 text-sm font-semibold">
            근거 논문 <span className="num font-normal text-muted">{cites.length}</span>
            <ChevronDown className="ml-auto h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ol className="divide-y divide-line border-t border-line text-sm">
            {cites.map((c) => (
              <li key={c.n} className="grid grid-cols-[2rem_1fr] gap-2 px-4 py-3">
                <span className="num font-semibold text-signal">{c.n}</span>
                <span className="min-w-0">
                  <Link href={`/papers/${c.paper_id}`} className="title-serif link-quiet">{c.title}</Link>
                  <span className="num mt-0.5 block text-xs text-muted">{[c.venue, c.year, `p.${c.page ?? '?'}`].filter(Boolean).join(' · ')}</span>
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
      <form onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="shadow-pop sticky bottom-[max(1rem,env(safe-area-inset-bottom))] mt-8 flex items-end gap-2 rounded-xl border border-line-strong bg-surface p-2 focus-within:border-signal">
        <label htmlFor="ai-input" className="sr-only">AI에게 질문</label>
        <textarea id="ai-input" value={input} rows={1} onChange={(e) => setInput(e.target.value)} maxLength={1000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(input); } }}
          placeholder="예: 28nm CMOS 저잡음 증폭기의 잡음지수 개선 기법은?"
          className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-6 text-ink outline-none placeholder:text-faint sm:text-[15px]" />
        <button disabled={busy || !input.trim()} aria-label="질문 보내기" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-signal text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-950">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}
