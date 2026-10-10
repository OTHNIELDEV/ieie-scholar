'use client';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Theme = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'ieie-theme';
// 헤더·모바일 메뉴 등 여러 토글 인스턴스의 선택 상태를 맞추기 위한 이벤트
const THEME_CHANGE_EVENT = 'ieie-theme-change';

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: '시스템 설정', Icon: Monitor },
  { value: 'light', label: '라이트 모드', Icon: Sun },
  { value: 'dark', label: '다크 모드', Icon: Moon },
];

/** 첫 페인트 전에 실행되어 저장된 테마를 적용한다 (깜빡임 방지). layout.tsx 의 <head> 에 인라인으로 넣는다. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.classList.add(t)}}catch(e){}})();`;

const THEME_COLOR = { light: '#f6f8fb', dark: '#0b1324' } as const;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme !== 'system') root.classList.add(theme);
  // 모바일 브라우저 주소창 색도 선택한 테마에 맞춘다 (system 이면 media 기준 원래 값으로)
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const media = meta.getAttribute('media') ?? '';
    const original = media.includes('dark') ? THEME_COLOR.dark : THEME_COLOR.light;
    meta.content = theme === 'system' ? original : THEME_COLOR[theme];
  });
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    setTheme(readStoredTheme());
    const onLocalChange = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    // 다른 탭에서 테마를 바꾼 경우에도 따라간다
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      const next = readStoredTheme();
      applyTheme(next);
      setTheme(next);
    };
    window.addEventListener(THEME_CHANGE_EVENT, onLocalChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onLocalChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  function choose(next: Theme) {
    applyTheme(next);
    window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: next }));
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 저장소를 쓸 수 없는 환경(사파리 비공개 모드 등)에서는 이번 방문에만 적용된다
    }
  }

  return (
    <div role="radiogroup" aria-label="화면 테마" className={cn('inline-flex items-center rounded-lg border border-line bg-sunken p-0.5', className)}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10',
            theme === value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
