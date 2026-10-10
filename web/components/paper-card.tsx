import Link from 'next/link';
import type { SearchHit } from '@/types/models';
import { Badge } from './ui/badge';

export function PaperCard({ p }: { p: SearchHit }) {
  return (
    <article className="py-4 border-b border-gray-100 dark:border-gray-800">
      <Link href={`/papers/${p.id}`} className="text-base font-semibold hover:text-brand-600 leading-snug">
        {p.title_ko ?? p.title_en}
      </Link>
      {p.title_ko && p.title_en && <p className="text-sm text-gray-500">{p.title_en}</p>}
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {p.authors?.slice(0, 5).join(', ')}{(p.authors?.length ?? 0) > 5 && ' 외'} · {p.venue} · {p.year}
      </p>
      {(p.snippet || p.abstract) && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-2" dangerouslySetInnerHTML={{ __html: p.snippet ?? p.abstract ?? '' }} />}
      <div className="mt-2 flex gap-1.5">
        {p.oa && <Badge tone="green">Open Access</Badge>}
        {p.award && <Badge tone="amber">{p.award}</Badge>}
        {p.society && <Badge>{p.society}</Badge>}
      </div>
    </article>
  );
}
