'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const inputId = useId();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [ai, setAi] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(ai ? `/ai?q=${encodeURIComponent(q)}` : `/search?q=${encodeURIComponent(q)}`);
  };
  const placeholder = ai
    ? '질문을 문장으로 입력하세요'
    : '논문, 저자, 키워드 검색';
  return (
    <form
      onSubmit={submit}
      role="search"
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg border bg-surface transition-[border-color,box-shadow] duration-200',
        'focus-within:shadow-[0_0_0_4px_rgb(var(--c-accent)/0.12)]',
        ai ? 'border-signal/70 focus-within:border-signal' : 'border-line-strong focus-within:border-accent',
        compact ? 'h-10 pl-3 pr-1 [@media(pointer:coarse)]:h-11' : 'shadow-lift h-14 pl-3 pr-1.5 min-[360px]:pl-4 sm:h-16 sm:pl-5 sm:pr-2',
      )}
    >
      <label htmlFor={inputId} className="sr-only">{ai ? 'AI에게 질문' : '논문 검색'}</label>
      {ai
        ? <Sparkles className={cn('shrink-0 text-signal', compact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden="true" />
        : <Search className={cn('shrink-0 text-faint', compact ? 'h-4 w-4' : 'h-5 w-5 max-[359px]:hidden')} aria-hidden="true" />}
      <input
        id={inputId}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        // iOS 는 16px 미만 입력창에서 자동 확대하므로 모바일에서는 16px 를 유지한다
        className={cn('min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint', compact ? 'sm:text-sm' : 'sm:text-lg')}
      />
      <button
        type="button"
        onClick={() => setAi(!ai)}
        aria-pressed={ai}
        title="AI 답변 모드"
        className={cn(
          'flex shrink-0 items-center gap-1 rounded-md font-medium transition-colors duration-150',
          compact ? 'h-8 px-2 text-xs [@media(pointer:coarse)]:h-9' : 'h-10 px-3 text-sm',
          ai ? 'bg-signal text-white dark:text-brand-950' : 'text-muted hover:bg-sunken hover:text-ink',
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI<span className={compact ? 'hidden' : 'hidden sm:inline'}> 답변</span>
      </button>
      {!compact && (
        <button type="submit" aria-label="검색" className="btn-primary h-11 shrink-0 px-4 text-base sm:px-5">
          <span className="hidden sm:inline">검색</span>
          <Search className="h-4 w-4 sm:hidden" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
