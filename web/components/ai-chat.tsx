'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';

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
    const res = await fetch('/api/ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, paperId }) });
    const c = res.headers.get('x-citations');
    if (c) setCites(JSON.parse(decodeURIComponent(c)));
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let acc = '';
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      for (const line of dec.decode(value, { stream: true }).split('\n')) {
        if (line.startsWith('0:')) { acc += JSON.parse(line.slice(2)); setMsgs([...next, { role: 'assistant', content: acc }]); }
      }
    }
    setBusy(false);
  }
  useEffect(() => { if (initialQ && !started.current) { started.current = true; ask(initialQ); } }, []); // eslint-disable-line

  const render = (t: string) => t.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/); if (!m) return <span key={i}>{part}</span>;
    const c = cites.find((x) => x.n === Number(m[1]));
    return c ? <Link key={i} href={`/papers/${c.paper_id}`} title={`${c.title} (${c.year}) p.${c.page ?? '?'}`} className="text-brand-600 font-medium">[{c.n}]</Link> : <span key={i}>{part}</span>;
  });

  return (
    <div className="mt-6">
      <div className="space-y-4 min-h-[20rem]">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[90%] text-left rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>{m.role === 'assistant' ? render(m.content) || (busy ? '…' : '') : m.content}</div>
          </div>
        ))}
      </div>
      {cites.length > 0 && (
        <details className="mt-4 text-sm"><summary className="cursor-pointer text-gray-500">근거 논문 {cites.length}건</summary>
          <ol className="mt-2 space-y-1">{cites.map((c) => <li key={c.n}>[{c.n}] <Link href={`/papers/${c.paper_id}`} className="hover:text-brand-600">{c.title}</Link> <span className="text-gray-400">{c.venue} {c.year} p.{c.page ?? '?'}</span></li>)}</ol></details>
      )}
      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="mt-6 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder="예: 28nm CMOS 저잡음 증폭기의 잡음지수 개선 기법은?" className="flex-1 rounded-lg border px-4 py-2 bg-transparent" />
        <button disabled={busy} className="btn-primary"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
}
