import { cn } from '@/lib/utils';
const tones = {
  gray: 'border-line-strong/70 bg-sunken text-muted',
  green: 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300',
  amber: 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300',
  blue: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-400/25 dark:bg-brand-400/10 dark:text-brand-200',
};
export function Badge({ children, tone = 'gray', className }: { children: React.ReactNode; tone?: keyof typeof tones; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-px text-xs font-medium leading-5', tones[tone], className)}>{children}</span>;
}
