'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Quote, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type P = { title: string; authors: string[]; venue: string; year?: number; pages?: string; doi?: string | null; url: string };

const COPIED_RESET_MS = 2000;

export function citationFormats(p: P) {
  const a = p.authors.join(', ');
  return {
    IEEE: `${a}, "${p.title}," ${p.venue}, ${p.year ?? ''}${p.pages ? `, pp. ${p.pages}` : ''}.${p.doi ? ` doi: ${p.doi}` : ''}`,
    APA: `${a} (${p.year ?? 'n.d.'}). ${p.title}. ${p.venue}${p.pages ? `, ${p.pages}` : ''}.${p.doi ? ` https://doi.org/${p.doi}` : ''}`,
    국문: `${a}, "${p.title}", ${p.venue}, ${p.year ?? ''}${p.pages ? `, pp. ${p.pages}` : ''}.`,
    BibTeX: `@inproceedings{ieie${p.year ?? ''}${(p.authors[0] ?? 'x').replace(/\W/g, '')},\n  title={${p.title}},\n  author={${p.authors.join(' and ')}},\n  booktitle={${p.venue}},\n  year={${p.year ?? ''}},${p.pages ? `\n  pages={${p.pages}},` : ''}${p.doi ? `\n  doi={${p.doi}},` : ''}\n  url={${p.url}}\n}`,
  };
}

export function CitationButton(p: P) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fmt, setFmt] = useState<keyof ReturnType<typeof citationFormats>>('IEEE');
  const root = useRef<HTMLDivElement>(null);
  const f = citationFormats(p);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer); };
  }, [open]);

  async function copy() {
    await navigator.clipboard.writeText(f[fmt]);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return (
    <div ref={root} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="citation-panel" className="btn"><Quote className="h-4 w-4" aria-hidden="true" /> 인용하기</button>
      {open && (
        // 모바일·소형 태블릿: 화면 하단 시트 / md 이상: 버튼 아래 팝오버
        <div id="citation-panel" role="dialog" aria-label="인용 형식"
          className="shadow-pop fixed inset-x-3 bottom-3 z-40 rounded-xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:mt-2 md:w-[30rem] md:max-w-[calc(100vw-2rem)] md:rounded-lg md:pb-4">
          <div className="flex items-center gap-1 border-b border-line pb-3" role="tablist" aria-label="인용 형식">
            {(Object.keys(f) as (keyof typeof f)[]).map((k) => (
              <button key={k} role="tab" aria-selected={fmt === k} onClick={() => { setFmt(k); setCopied(false); }}
                className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 [@media(pointer:coarse)]:py-2', fmt === k ? 'bg-ink text-paper' : 'text-muted hover:bg-sunken hover:text-ink')}>{k}</button>
            ))}
            <button onClick={() => setOpen(false)} aria-label="닫기" className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink md:hidden">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-sunken p-3 text-xs leading-5 text-ink">{f[fmt]}</pre>
          <div className="mt-3 flex items-center justify-end gap-3">
            <span aria-live="polite" className="text-xs text-signal">{copied ? `${fmt} 형식을 복사했습니다` : ''}</span>
            <button onClick={copy} className="btn h-8 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-signal" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />} 복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
