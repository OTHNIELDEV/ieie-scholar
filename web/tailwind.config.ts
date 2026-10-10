import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef4ff', 100: '#d9e5ff', 500: '#2b5bd7', 600: '#1f47b3', 700: '#19388c', 900: '#0f2152' },
      },
      fontFamily: { sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
