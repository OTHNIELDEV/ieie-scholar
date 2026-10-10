'use client';
import { useState } from 'react';
import { Quote } from 'lucide-react';

type P = { title: string; authors: string[]; venue: string; year?: number; pages?: string; doi?: string | null; url: string };

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
  const [fmt, setFmt] = useState<keyof ReturnType<typeof citationFormats>>('IEEE');
  const f = citationFormats(p);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn"><Quote className="w-4 h-4" /> 인용</button>
      {open && (
        <div className="absolute z-10 mt-2 w-[28rem] max-w-[90vw] rounded-lg border bg-white dark:bg-gray-900 p-3 shadow-lg">
          <div className="flex gap-1 mb-2">{(Object.keys(f) as (keyof typeof f)[]).map((k) => (
            <button key={k} onClick={() => setFmt(k)} className={`px-2 py-0.5 text-xs rounded ${fmt === k ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>{k}</button>
          ))}</div>
          <pre className="text-xs whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-800 p-2 rounded">{f[fmt]}</pre>
          <button onClick={() => navigator.clipboard.writeText(f[fmt])} className="mt-2 text-xs text-brand-600">클립보드 복사</button>
        </div>
      )}
    </div>
  );
}
