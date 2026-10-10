'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [ai, setAi] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(ai ? `/ai?q=${encodeURIComponent(q)}` : `/search?q=${encodeURIComponent(q)}`);
  };
  return (
    <form onSubmit={submit} className={cn('flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900', compact ? 'h-9 px-3' : 'h-14 px-5 text-lg shadow-sm')}>
      <Search className="w-4 h-4 text-gray-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="논문, 저자, 키워드, 수식… 자연어 질문도 가능" className="flex-1 bg-transparent outline-none" />
      <button type="button" onClick={() => setAi(!ai)} className={cn('flex items-center gap-1 text-xs rounded-md px-2 py-1', ai ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800')} title="AI 답변 모드">
        <Sparkles className="w-3 h-3" /> AI
      </button>
    </form>
  );
}
