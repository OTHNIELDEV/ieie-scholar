import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/db/server';
const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabaseAdmin().from('papers').select('id, updated_at').order('id').limit(45000);
  return [{ url: base, changeFrequency: 'daily', priority: 1 }, ...(data ?? []).map((p) => ({ url: `${base}/papers/${p.id}`, lastModified: p.updated_at, changeFrequency: 'monthly' as const, priority: 0.7 }))];
}
