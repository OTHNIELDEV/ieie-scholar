import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: { default: 'IEIE Scholar — 대한전자공학회 논문 플랫폼', template: '%s | IEIE Scholar' },
  description: '대한전자공학회 학술대회·논문지 3만 편 이상을 검색하고 AI로 분석하는 전자공학 연구 플랫폼',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
