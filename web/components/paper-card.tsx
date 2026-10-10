import Link from 'next/link';
import type { SearchHit } from '@/types/models';
import { Badge } from './ui/badge';

export function PaperCard({ p }: { p: SearchHit }) {
  const authors = p.authors ?? [];
  return (
    <article className="group py-5">
      <h3>
        <Link href={`/papers/${p.id}`} className="title-serif text-[17px] leading-7 transition-colors duration-150 group-hover:text-accent sm:text-lg">
          {p.title_ko ?? p.title_en}
        </Link>
      </h3>
      {p.title_ko && p.title_en && <p className="mt-0.5 text-sm leading-6 text-muted">{p.title_en}</p>}
      <p className="mt-2 text-sm text-ink/80">
        {authors.slice(0, 5).join(', ')}{authors.length > 5 && ' 외'}
        <span className="text-muted"> · {p.venue}{p.year && <> · <span className="num">{p.year}</span></>}</span>
      </p>
      {(p.snippet || p.abstract) && (
        <p className="mt-2 line-clamp-3 max-w-measure text-sm leading-6 text-muted sm:line-clamp-2" dangerouslySetInnerHTML={{ __html: p.snippet ?? p.abstract ?? '' }} />
      )}
      {(p.oa || p.award || p.society) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.oa && <Badge tone="green">Open Access</Badge>}
          {p.award && <Badge tone="amber">{p.award}</Badge>}
          {p.society && <Badge>{p.society}</Badge>}
        </div>
      )}
    </article>
  );
}
