import { NextResponse } from 'next/server';
import { supabaseServer, supabaseAdmin } from '@/lib/db/server';

/** 원문 접근 — can_access_fulltext() RLS 함수로 권한 확인 후 R2 서명 URL로 리다이렉트 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { data: { user } } = await supabaseServer().auth.getUser();
  const admin = supabaseAdmin();
  const { data: paper } = await admin.from('papers').select('id, fulltext_key, oa_status').eq('id', id).maybeSingle();
  if (!paper?.fulltext_key) return NextResponse.json({ error: 'no fulltext' }, { status: 404 });
  const { data: ok } = await admin.rpc('can_access_fulltext', { p_user: user?.id ?? null, p_paper: id });
  if (!ok) return NextResponse.redirect(new URL(`/papers/${id}?access=denied`, req.url));
  const download = new URL(req.url).searchParams.get('download') === '1';
  await admin.from('events').insert({ user_id: user?.id, event: download ? 'download' : 'view', paper_id: id });
  // Cloudflare Worker가 10분 서명 URL 발급 (워터마크 삽입은 Worker 측)
  const signed = `${process.env.R2_PUBLIC_BASE}/sign?key=${encodeURIComponent(paper.fulltext_key)}&u=${user?.id ?? 'anon'}&dl=${download ? 1 : 0}`;
  return NextResponse.redirect(signed);
}
