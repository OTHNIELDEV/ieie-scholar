import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { themeInitScript } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: { default: 'IEIE Scholar — 대한전자공학회 논문 플랫폼', template: '%s | IEIE Scholar' },
  description: '대한전자공학회 학술대회·논문지 3만 편 이상을 검색하고 AI로 분석하는 전자공학 연구 플랫폼',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1324' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 테마 스크립트가 hydration 전에 class 를 바꾸므로 경고를 억제한다
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700&display=swap" />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-white">
          본문으로 건너뛰기
        </a>
        <Header />
        <main id="content" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
