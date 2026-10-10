import Link from 'next/link';
import { Wordmark } from './wordmark';

// href 가 없는 항목은 페이지가 준비되면 링크로 전환한다
const LINKS: { label: string; href?: string; strong?: boolean }[] = [
  { label: 'Open API', href: '/api-docs' },
  { label: 'OAI-PMH' },
  { label: '이용약관' },
  { label: '개인정보처리방침', strong: true },
];

export function Footer() {
  return (
    <footer className="no-print mt-24 border-t border-line bg-surface">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-md text-sm leading-6 text-muted">
            사단법인 대한전자공학회<br />
            The Institute of Electronics and Information Engineers
          </p>
        </div>
        <div className="space-y-3 md:text-right">
          <nav aria-label="사이트 정보">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm md:justify-end">
              {LINKS.map((l) => (
                <li key={l.label} className={l.strong ? 'font-semibold text-ink' : 'text-muted'}>
                  {l.href ? <Link href={l.href} className="link-quiet">{l.label}</Link> : l.label}
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-xs text-faint">© {new Date().getFullYear()} 대한전자공학회. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
