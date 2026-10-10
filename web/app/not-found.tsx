import Link from 'next/link';
export default function NotFound() {
  return <div className="mx-auto max-w-2xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1><Link href="/" className="btn mt-6">홈으로</Link></div>;
}
