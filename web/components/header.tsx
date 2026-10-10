import Link from 'next/link';
import { Wordmark } from './wordmark';
import { DesktopNav, HeaderSearch, MobileMenu } from './header-nav';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/75">
      <div className="container-page relative flex h-16 items-center gap-4 lg:gap-6">
        <Wordmark />
        <DesktopNav />
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          <HeaderSearch />
          <ThemeToggle className="hidden lg:inline-flex" />
          <Link href="/login" className="btn hidden sm:inline-flex">로그인</Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
