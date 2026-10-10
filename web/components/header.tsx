import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBox } from './search-box';

export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur z-20">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-bold text-brand-600 whitespace-nowrap">IEIE Scholar</Link>
        <nav className="hidden md:flex gap-5 text-sm text-gray-600 dark:text-gray-300">
          <Link href="/venues">간행물</Link>
          <Link href="/venues?type=conference">학술대회</Link>
          <Link href="/ai" className="text-brand-600 font-medium">AI 리서치</Link>
          <Link href="/api-docs">API</Link>
        </nav>
        <div className="flex-1 max-w-xl ml-auto"><Suspense><SearchBox compact /></Suspense></div>
        <Link href="/login" className="text-sm whitespace-nowrap">로그인</Link>
      </div>
    </header>
  );
}
