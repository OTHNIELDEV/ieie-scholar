export type Venue = {
  id: number; slug: string; title_ko: string; title_en: string | null; venue_type: string;
  issn_print: string | null; issn_online: string | null; indexing: string[] | null; active: boolean; description: string | null;
};
export type Issue = {
  id: number; venue_id: number; volume: string | null; number: string | null; year: number; month: number | null;
  title: string | null; event_start: string | null; event_end: string | null; location: string | null; paper_count: number;
};
export type Paper = {
  id: number; uuid: string; doi: string | null; title_ko: string | null; title_en: string | null;
  abstract_ko: string | null; abstract_en: string | null; keywords_ko: string[] | null; keywords_en: string[] | null;
  language: string; page_start: string | null; page_end: string | null; published_at: string | null; presented_at: string | null;
  presentation: string | null; award: string | null; oa_status: string; fulltext_key: string | null;
  citation_count: number; view_count: number; download_count: number; venue_id: number; issue_id: number | null; session_id: number | null;
};
export type PaperAuthor = {
  position: number; raw_name: string; raw_affiliation: string | null; is_corresponding: boolean;
  author: { id: number; name_ko: string | null; name_en: string | null; orcid: string | null } | null;
};
export type Author = {
  id: number; name_ko: string | null; name_en: string | null; orcid: string | null; h_index: number | null; paper_count: number; bio: string | null; homepage: string | null;
};
export type SearchHit = {
  id: number; title_ko?: string; title_en?: string; abstract?: string; authors?: string[]; venue?: string; year?: number;
  society?: string; award?: string; oa?: boolean; score?: number; snippet?: string;
};
export type SearchParams = {
  q: string; page?: number; per?: number; year_from?: number; year_to?: number; society?: string; venue?: string;
  type?: string; oa?: boolean; sort?: 'relevance' | 'newest' | 'cited' | 'viewed';
};
