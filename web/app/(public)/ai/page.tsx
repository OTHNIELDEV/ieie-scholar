import { Suspense } from 'react';
import Link from 'next/link';
import { AiChat } from '@/components/ai-chat';
export const metadata = { title: 'AI 리서치' };
export default function AiPage({ searchParams }: { searchParams: { q?: string; paper?: string } }) {
  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <header className="border-b border-line pb-6">
        <h1 className="title-serif text-3xl sm:text-4xl">AI 리서치</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          {searchParams.paper
            ? <>선택한 <Link href={`/papers/${searchParams.paper}`} className="link">논문</Link> 안에서만 근거를 찾아 답합니다.</>
            : '대한전자공학회 논문 원문을 근거로 답합니다. 답변의 각 문장에는 근거 논문 번호 [n]이 붙고, 번호를 누르면 해당 논문으로 이동합니다.'}
        </p>
      </header>
      <Suspense><AiChat initialQ={searchParams.q} paperId={searchParams.paper ? Number(searchParams.paper) : undefined} /></Suspense>
    </div>
  );
}
