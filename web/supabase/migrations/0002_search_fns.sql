-- 벡터 검색 RPC
create or replace function match_chunks(
  query_embedding vector(1024), match_count int default 12, min_similarity real default 0.2, p_paper_id bigint default null
) returns table (chunk_id bigint, paper_id bigint, content text, page smallint, bbox real[], title_ko text, title_en text, year int, venue text, similarity real)
language sql stable as $$
  select c.id, c.paper_id, c.content, c.page, c.bbox, p.title_ko, p.title_en,
         extract(year from p.published_at)::int, v.title_ko,
         (1 - (c.embedding <=> query_embedding))::real as similarity
  from paper_chunks c join papers p on p.id = c.paper_id join venues v on v.id = p.venue_id
  where (p_paper_id is null or c.paper_id = p_paper_id)
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 유사 논문 (대표 벡터 = abstract 청크)
create or replace function similar_papers(p_paper_id bigint, p_k int default 8)
returns table (id bigint, title_ko text, title_en text, published_at date, similarity real)
language sql stable as $$
  with src as (select embedding from paper_chunks where paper_id = p_paper_id and chunk_type = 'abstract' limit 1)
  select p.id, p.title_ko, p.title_en, p.published_at, (1 - (c.embedding <=> src.embedding))::real
  from src, paper_chunks c join papers p on p.id = c.paper_id
  where c.chunk_type = 'abstract' and c.paper_id <> p_paper_id
  order by c.embedding <=> src.embedding limit p_k;
$$;

-- 조회수 증가
create or replace function increment_view(p_paper_id bigint) returns void language sql as $$
  update papers set view_count = view_count + 1 where id = p_paper_id;
$$;
