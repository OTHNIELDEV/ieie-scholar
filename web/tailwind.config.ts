import type { Config } from 'tailwindcss';

// 의미 토큰은 globals.css 의 CSS 변수(RGB 채널)에서 라이트/다크를 함께 정의한다.
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  // 시스템 설정을 따르되, 사용자가 고른 테마(<html class="light|dark">)가 우선한다.
  darkMode: ['variant', ['@media (prefers-color-scheme: dark) { &:not(.light *) }', '&:is(.dark *)']],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3fc', 100: '#d9e4f8', 200: '#b5c8f0', 300: '#86a4e3', 400: '#5279d2',
          500: '#2f58c0', 600: '#2148a6', 700: '#1b3a87', 800: '#172f6b', 900: '#12244f', 950: '#0b1733',
        },
        paper: token('paper'),
        surface: token('surface'),
        sunken: token('sunken'),
        ink: token('ink'),
        muted: token('muted'),
        faint: token('faint'),
        line: token('line'),
        'line-strong': token('line-strong'),
        accent: token('accent'),
        primary: token('primary'),
        'primary-hover': token('primary-hover'),
        signal: token('signal'),
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Noto Serif KR"', '"Nanum Myeongjo"', 'serif'],
      },
      maxWidth: { measure: '68ch' },
    },
  },
  plugins: [],
};
export default config;
