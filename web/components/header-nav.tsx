'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Menu, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchBox } from './search-box';
import { ThemeToggle } from './theme-toggle';

const NAV = [
  { href: '/venues', label: '간행물', match: (p: string, t: string | null) => p.startsWith('/venues') && t !== 'conference' },
  { href: '/venues?type=conference', label: '학술대회', match: (p: string, t: string | null) => p.startsWith('/venues') && t === 'conference' },
  { href: '/ai', label: 'AI 리서치', match: (p: string) => p.startsWith('/ai'), ai: true },
  { href: '/api-docs', label: 'Open API', match: (p: string) => p.startsWith('/api-docs') },
];

function NavLinks({ vertical = false, onNavigate }: { vertical?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const type = useSearchParams().get('type');
  return (
    <ul className={cn(vertical ? 'flex flex-col' : 'flex items-center gap-1')}>
      {NAV.map((n) => {
        const active = n.match(pathname, type);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors duration-150',
                vertical ? 'px-2 py-3 text-base' : 'h-9 px-3',
                active ? 'text-accent' : 'text-muted hover:text-ink',
                !vertical && active && 'bg-accent/10',
              )}
            >
              {n.ai && <Sparkles className="h-3.5 w-3.5 text-signal" aria-hidden="true" />}
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DesktopNav() {
  return (
    <nav aria-label="주요 메뉴" className="hidden lg:block">
      <Suspense><NavLinks /></Suspense>
    </nav>
  );
}

/** 홈에는 히어로 검색창이 있으므로 헤더 검색창을 숨긴다 */
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return (
    <div className="hidden min-w-0 max-w-md flex-1 md:block">
      <Suspense><SearchBox compact /></Suspense>
    </div>
  );
}

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-sunken"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div id="mobile-menu" className="shadow-pop absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-line bg-surface">
          <div className="container-page space-y-3 py-4">
            <Suspense><SearchBox compact /></Suspense>
            <nav aria-label="주요 메뉴">
              <Suspense><NavLinks vertical onNavigate={() => setOpen(false)} /></Suspense>
            </nav>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-muted">화면 테마</span>
              <ThemeToggle />
            </div>
            <Link href="/login" className="btn h-11 w-full sm:hidden">로그인</Link>
          </div>
        </div>
      )}
    </div>
  );
}
