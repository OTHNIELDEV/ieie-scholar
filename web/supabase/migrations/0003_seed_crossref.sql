-- Crossref 시드 (data/seed/*.json → http 확장으로 서버측 적재). Supabase MCP로 2026-10-10 적용됨.
-- 재실행 시 on conflict do nothing 으로 멱등.
create extension if not exists http with schema extensions;
-- 1) issues / 2) papers  : seed_papers.json
-- 3) paper_authors / 4) authors(정규화 성명 단위) / 5) references_raw / 6) citations : seed_authors.json, seed_refs.json
-- 전체 SQL은 Supabase 대시보드 > Database > Migrations 의 seed_crossref_papers, seed_crossref_authors_refs 참조.
