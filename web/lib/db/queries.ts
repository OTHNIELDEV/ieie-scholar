import { supabaseAdmin } from './server';
import type { Paper, PaperAuthor, Issue, Venue, Author } from '@/types/models';

const db = () => supabaseAdmin();

export async function getPaper(id: string | number) {
  const { data } = await db()
    .from('papers')
    .select(`*, venue:venues(*), issue:issues(*), session:sessions(*),
             paper_authors(position, raw_name, raw_affiliation, is_corresponding, author:authors(id, name_ko, name_en, orcid)),
             summaries:paper_summaries(kind, lang, content), figures:paper_figures(id, fig_type, label, caption, image_key, page),
             links:paper_links(link_type, url)`)
    .eq(typeof id === 'number' || /^\d+$/.test(String(id)) ? 'id' : 'doi', id)
    .maybeSingle();
  return data as (Paper & { venue: Venue; issue: Issue; paper_authors: PaperAuthor[]; summaries: any[]; figures: any[]; links: any[]; session: any }) | null;
}

export async function getReferences(paperId: number) {
  const { data } = await db().from('references_raw').select('position, raw_text, matched_doi, matched_paper_id').eq('paper_id', paperId).order('position');
  return data ?? [];
}

export async function getCitedBy(paperId: number) {
  const { data } = await db()
    .from('citations')
    .select('source, context, citing_doi, citing:papers!citations_citing_paper_id_fkey(id, title_ko, title_en, published_at)')
    .eq('cited_paper_id', paperId)
    .limit(100);
  return data ?? [];
}

export async function getSimilar(paperId: number, k = 8) {
  const { data } = await db().rpc('similar_papers', { p_paper_id: paperId, p_k: k });
  return (data ?? []) as Pick<Paper, 'id' | 'title_ko' | 'title_en' | 'published_at'>[];
}

export async function getVenue(slug: string) {
  const { data } = await db().from('venues').select('*, issues(*)').eq('slug', slug).maybeSingle();
  return data as (Venue & { issues: Issue[] }) | null;
}

export async function getIssueWithSessions(issueId: number) {
  const { data: issue } = await db().from('issues').select('*, venue:venues(*)').eq('id', issueId).maybeSingle();
  if (!issue) return null;
  const { data: sessions } = await db().from('sessions').select('*').eq('issue_id', issueId).order('start_at');
  const { data: papers } = await db()
    .from('papers')
    .select('id, title_ko, title_en, session_id, page_start, page_end, award, presentation, paper_authors(raw_name, position)')
    .eq('issue_id', issueId)
    .order('page_start');
  return { issue, sessions: sessions ?? [], papers: papers ?? [] };
}

export async function getAuthor(id: string | number) {
  const { data: author } = await db().from('authors').select('*, org:organizations(name_ko, name_en)').eq('id', id).maybeSingle();
  if (!author) return null;
  const { data: papers } = await db()
    .from('paper_authors')
    .select('position, paper:papers(id, title_ko, title_en, published_at, citation_count, venue:venues(title_ko, slug))')
    .eq('author_id', id)
    .limit(500);
  return { author: author as Author & { org: any }, papers: (papers ?? []).map((p: any) => ({ ...p.paper, position: p.position })) };
}

export async function getHomeData() {
  const d = db();
  const [latest, top, venues] = await Promise.all([
    d.from('papers').select('id, title_ko, title_en, published_at, venue:venues(title_ko)').order('published_at', { ascending: false }).limit(10),
    d.from('papers').select('id, title_ko, title_en, view_count, citation_count').order('view_count', { ascending: false }).limit(10),
    d.from('venues').select('slug, title_ko, venue_type, indexing').eq('active', true).order('venue_type'),
  ]);
  return { latest: latest.data ?? [], top: top.data ?? [], venues: venues.data ?? [] };
}
