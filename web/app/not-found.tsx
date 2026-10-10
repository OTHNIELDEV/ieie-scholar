import Link from 'next/link';
import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';

export default function NotFound() {
  return (
    <div className="container-page max-w-2xl py-20 text-center sm:py-24">
      <p className="num font-serif text-6xl font-semibold text-line-strong">404</p>
      <h1 className="title-serif mt-4 text-2xl">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-muted">주소가 바뀌었거나 삭제된 페이지입니다. 찾으시는 논문을 바로 검색해 보세요.</p>
      <div className="mt-8 text-left"><Suspense><SearchBox compact /></Suspense></div>
      <Link href="/" className="btn mt-6">홈으로 가기</Link>
    </div>
  );
}
