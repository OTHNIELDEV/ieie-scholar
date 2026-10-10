import Link from 'next/link';

/** 워드마크 — 펄스 파형 글리프 + IEIE Scholar */
export function Wordmark() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="IEIE Scholar 홈">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="7" className="fill-primary" />
        <path d="M5 20h5V11h5v10h4v-6h3.5c1.2 0 1.6 2.5 2.5 2.5S26 17 27 17" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-tight text-ink">
          IEIE <span className="font-serif font-semibold text-accent">Scholar</span>
        </span>
        <span className="mt-1 hidden text-[11px] text-muted sm:block">대한전자공학회 학술정보</span>
      </span>
    </Link>
  );
}
