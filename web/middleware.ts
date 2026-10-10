import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// 세션 갱신 + 기관 IP 인증 헤더 부여
export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options?: any }[]) => cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  );
  await supabase.auth.getUser();
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? '';
  if (ip) res.headers.set('x-client-ip', ip);
  return res;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'] };
