import { Suspense } from 'react';
import { AiChat } from '@/components/ai-chat';
export const metadata = { title: 'AI 리서치' };
export default function AiPage({ searchParams }: { searchParams: { q?: string; paper?: string } }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">AI 리서치</h1>
      <p className="text-sm text-gray-500 mt-1">{searchParams.paper ? `논문 #${searchParams.paper} 범위 내 질의응답` : '대한전자공학회 논문 원문을 근거로 답합니다. 모든 문장에 [n] 출처가 붙습니다.'}</p>
      <Suspense><AiChat initialQ={searchParams.q} paperId={searchParams.paper ? Number(searchParams.paper) : undefined} /></Suspense>
    </div>
  );
}
