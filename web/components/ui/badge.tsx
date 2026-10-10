import { cn } from '@/lib/utils';
const tones = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  blue: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-100',
};
export function Badge({ children, tone = 'gray', className }: { children: React.ReactNode; tone?: keyof typeof tones; className?: string }) {
  return <span className={cn('inline-block rounded px-1.5 py-0.5 text-[11px] font-medium', tones[tone], className)}>{children}</span>;
}
