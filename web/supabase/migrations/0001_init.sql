-- 05. IEIE Scholar — PostgreSQL / Supabase 스키마 (v0.1)
-- 적용: supabase migration new init && 본 파일 복사 → supabase db push
-- 전제: extensions: pgvector, pg_trgm, unaccent, pgcrypto

create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists pgcrypto;

-- =========================================================
-- 1. 분류·조직
-- =========================================================
create table societies (                       -- 6개 소사이어티
  id          smallserial primary key,
  code        text unique not null,            -- COMM, SEMI, COMP, AISP, SYSC, INDE
  name_ko     text not null,
  name_en     text not null
);

create table subject_codes (                   -- 세부 기술분류(학회 자체 + IEEE 분류 매핑)
  id          serial primary key,
  parent_id   int references subject_codes(id),
  code        text unique not null,
  name_ko     text not null,
  name_en     text,
  society_id  smallint references societies(id),
  legacy_division text                         -- SD/SP/SC/CI/TC/IE 매핑
);

create table organizations (                   -- 대학·기업·연구소 (소속 정규화)
  id          serial primary key,
  name_ko     text not null,
  name_en     text,
  ror_id      text,                            -- Research Organization Registry
  domain      text,                            -- 이메일 도메인
  type        text check (type in ('university','company','institute','government','other')),
  country     text default 'KR'
);
create index on organizations using gin (name_ko gin_trgm_ops);

-- =========================================================
-- 2. 간행물·권호·학술대회
-- =========================================================
create table venues (                          -- 저널/학술대회 시리즈 (50종)
  id          serial primary key,
  slug        text unique not null,            -- j-ieie, jsts, spc, conf-summer, iceic ...
  title_ko    text not null,
  title_en    text,
  venue_type  text not null check (venue_type in ('journal','journal_legacy','conference_domestic','conference_intl','magazine','education','report')),
  issn_print  text,
  issn_online text,
  publisher   text default '대한전자공학회',
  indexing    text[],                          -- {'SCIE','SCOPUS','KCI'}
  active      boolean default true,
  successor_id int references venues(id),      -- 분과지 → 통합지
  description text
);

create table issues (                          -- 권호 / 학술대회 1회차
  id          serial primary key,
  venue_id    int not null references venues(id),
  volume      text,
  number      text,
  year        smallint not null,
  month       smallint,
  title       text,                            -- '2025년도 하계학술대회 논문집'
  event_start date,
  event_end   date,
  location    text,
  cover_url   text,
  paper_count int default 0,
  unique (venue_id, volume, number, year)
);

create table sessions (                        -- 학술대회 세션/트랙 (DBpia에 없는 구조)
  id          serial primary key,
  issue_id    int not null references issues(id) on delete cascade,
  society_id  smallint references societies(id),
  track       text,                            -- '반도체 소자', 'AI 신호처리'
  code        text,                            -- 'SD-3'
  title       text not null,
  chair       text,
  room        text,
  start_at    timestamptz,
  end_at      timestamptz,
  type        text check (type in ('oral','poster','invited','keynote','tutorial','panel'))
);

-- =========================================================
-- 3. 논문 (핵심)
-- =========================================================
create table papers (
  id              bigserial primary key,
  uuid            uuid unique default gen_random_uuid(),
  issue_id        int references issues(id),
  session_id      int references sessions(id),
  venue_id        int not null references venues(id),
  doi             text unique,
  legacy_ids      jsonb default '{}',          -- {"dbpia":"NODE123","kci":"ART00..","koreascience":".."}
  title_ko        text,
  title_en        text,
  abstract_ko     text,
  abstract_en     text,
  keywords_ko     text[],
  keywords_en     text[],
  language        text default 'ko',
  page_start      text,
  page_end        text,
  page_count      smallint,
  published_at    date,
  presented_at    timestamptz,
  presentation    text check (presentation in ('oral','poster','invited','keynote')),
  award           text,                        -- '우수논문상', 'Best Paper'
  oa_status       text default 'closed' check (oa_status in ('diamond','gold','green','embargo','closed')),
  embargo_until   date,
  fulltext_key    text,                        -- R2 object key
  fulltext_pages  smallint,
  fulltext_status text default 'none' check (fulltext_status in ('none','scanned','ocr','born_digital','parsed')),
  has_figures     boolean default false,
  has_tables      boolean default false,
  has_code_link   boolean default false,
  subject_ids     int[],
  citation_count  int default 0,               -- 통합(내부+Crossref+OpenAlex)
  internal_cited  int default 0,
  view_count      int default 0,
  download_count  int default 0,
  ai_summary_ready boolean default false,
  search_vector   tsvector,
  quality_flags   jsonb default '{}',          -- {"missing_abstract":true,...}
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on papers (venue_id, published_at desc);
create index on papers (issue_id);
create index on papers using gin (search_vector);
create index on papers using gin (keywords_ko);
create index on papers using gin (subject_ids);
create index on papers using gin (title_ko gin_trgm_ops);
create index on papers using gin (title_en gin_trgm_ops);

create or replace function papers_tsv_update() returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title_ko,'') || ' ' || coalesce(new.title_en,'')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.keywords_ko,'{}'),' ') || ' ' || array_to_string(coalesce(new.keywords_en,'{}'),' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.abstract_ko,'') || ' ' || coalesce(new.abstract_en,'')), 'C');
  new.updated_at := now();
  return new;
end $$;
create trigger trg_papers_tsv before insert or update on papers
for each row execute function papers_tsv_update();

-- =========================================================
-- 4. 저자 (명확화 포함)
-- =========================================================
create table authors (                         -- 정규화된 "사람"
  id            bigserial primary key,
  uuid          uuid unique default gen_random_uuid(),
  name_ko       text,
  name_en       text,
  name_variants text[],                        -- 표기 변형
  orcid         text unique,
  kri_id        text,                          -- 한국연구자정보
  email_hash    text,                          -- sha256(email) 매칭용
  current_org_id int references organizations(id),
  h_index       smallint,
  paper_count   int default 0,
  claimed_by    uuid references auth.users(id),-- 본인 인증 계정
  claimed_at    timestamptz,
  bio           text,
  homepage      text,
  created_at    timestamptz default now()
);
create index on authors using gin (name_ko gin_trgm_ops);
create index on authors using gin (name_en gin_trgm_ops);

create table paper_authors (                   -- 논문-저자 (원문 표기 보존)
  paper_id      bigint references papers(id) on delete cascade,
  author_id     bigint references authors(id),
  position      smallint not null,
  raw_name      text not null,                 -- 논문에 적힌 그대로
  raw_affiliation text,
  org_id        int references organizations(id),
  is_corresponding boolean default false,
  is_first      boolean default false,
  disambiguation_score real,                   -- 명확화 신뢰도 0~1
  primary key (paper_id, position)
);
create index on paper_authors (author_id);

create table labs (                            -- 연구실 페이지
  id            serial primary key,
  slug          text unique not null,
  name_ko       text not null,
  name_en       text,
  org_id        int references organizations(id),
  pi_author_id  bigint references authors(id),
  homepage      text,
  description   text,
  verified      boolean default false
);
create table lab_members (
  lab_id      int references labs(id) on delete cascade,
  author_id   bigint references authors(id),
  role        text,                            -- pi, phd, ms, alumni
  since_year  smallint,
  until_year  smallint,
  primary key (lab_id, author_id)
);

-- =========================================================
-- 5. 참고문헌·인용
-- =========================================================
create table references_raw (                  -- 참고문헌 원문 파싱 결과
  id            bigserial primary key,
  paper_id      bigint references papers(id) on delete cascade,
  position      smallint,
  raw_text      text not null,
  parsed        jsonb,                         -- {title, authors, year, venue, doi}
  matched_doi   text,
  matched_paper_id bigint references papers(id),  -- 내부 논문이면 연결
  match_confidence real
);
create index on references_raw (paper_id);
create index on references_raw (matched_paper_id);

create table citations (                       -- 그래프 엣지 (내부+외부)
  citing_paper_id bigint references papers(id) on delete cascade,
  cited_paper_id  bigint references papers(id) on delete cascade,
  cited_doi       text,                        -- 외부 논문
  citing_doi      text,                        -- 외부에서 인용한 경우
  source          text not null,               -- internal, crossref, openalex, semantic_scholar, kci
  context         text,                        -- 인용 문맥 문장
  primary key (citing_paper_id, cited_paper_id, source)
);
create index on citations (cited_paper_id);

-- =========================================================
-- 6. 원문 구조화 (멀티모달 AI용)
-- =========================================================
create table paper_sections (
  id          bigserial primary key,
  paper_id    bigint references papers(id) on delete cascade,
  position    smallint,
  heading     text,
  level       smallint,
  text        text,
  page_from   smallint,
  page_to     smallint
);
create index on paper_sections (paper_id);

create table paper_chunks (                    -- RAG 청크 + 임베딩
  id          bigserial primary key,
  paper_id    bigint references papers(id) on delete cascade,
  section_id  bigint references paper_sections(id),
  chunk_index smallint,
  chunk_type  text default 'text' check (chunk_type in ('text','abstract','figure_caption','table','equation','reference')),
  content     text not null,
  token_count smallint,
  page        smallint,
  bbox        real[],                          -- [x0,y0,x1,y1] 출처 하이라이트용
  embedding   vector(1024)                     -- voyage-3 / bge-m3
);
create index on paper_chunks using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 128);
create index on paper_chunks (paper_id, chunk_index);

create table paper_figures (
  id          bigserial primary key,
  paper_id    bigint references papers(id) on delete cascade,
  fig_type    text check (fig_type in ('figure','table','equation')),
  label       text,                            -- 'Fig. 3', 'Table II'
  caption     text,
  page        smallint,
  bbox        real[],
  image_key   text,                            -- R2
  extracted_data jsonb,                        -- 표: 행렬 JSON / 수식: latex
  embedding   vector(1024)                     -- 캡션(+이미지) 임베딩
);
create index on paper_figures (paper_id);
create index on paper_figures using hnsw (embedding vector_cosine_ops);

create table paper_specs (                     -- 성능 지표 정규화 (비교표 기능)
  id          bigserial primary key,
  paper_id    bigint references papers(id) on delete cascade,
  figure_id   bigint references paper_figures(id),
  metric      text not null,                   -- power, area, frequency, snr, accuracy ...
  value       numeric,
  unit        text,
  condition   text,                            -- '28nm CMOS, 1.0V'
  confidence  real
);
create index on paper_specs (metric);

create table paper_links (                     -- 코드/데이터셋/슬라이드/영상
  id          bigserial primary key,
  paper_id    bigint references papers(id) on delete cascade,
  link_type   text check (link_type in ('code','dataset','slides','poster','video','preprint','other')),
  url         text not null,
  verified    boolean default false
);

create table paper_summaries (                 -- AI 요약 캐시
  paper_id    bigint references papers(id) on delete cascade,
  kind        text check (kind in ('one_line','toc','method','easy','en','ko','key_points')),
  lang        text default 'ko',
  content     text not null,
  model       text,
  created_at  timestamptz default now(),
  primary key (paper_id, kind, lang)
);

-- =========================================================
-- 7. 사용자·권한·구독
-- =========================================================
create table profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  role          text default 'user' check (role in ('user','member','editor','admin')),
  member_no     text,                          -- 학회 회원번호
  member_valid_until date,
  org_id        int references organizations(id),
  author_id     bigint references authors(id),
  orcid         text,
  locale        text default 'ko',
  created_at    timestamptz default now()
);

create table institutions (                    -- 기관 구독
  id            serial primary key,
  org_id        int references organizations(id),
  plan          text check (plan in ('basic','ai','enterprise')),
  seats         int,
  valid_from    date,
  valid_until   date,
  sso_config    jsonb,
  ai_quota_month int
);
create table institution_ip_ranges (
  institution_id int references institutions(id) on delete cascade,
  cidr          cidr not null,
  primary key (institution_id, cidr)
);

create table subscriptions (                   -- 개인 구독
  id            bigserial primary key,
  user_id       uuid references auth.users(id),
  plan          text check (plan in ('free','member','pro','pro_ai')),
  status        text check (status in ('active','canceled','past_due')),
  period_start  timestamptz,
  period_end    timestamptz,
  provider      text,                          -- toss, stripe
  provider_ref  text
);

create table purchases (                       -- 단건 구매(비회원·비구독)
  id          bigserial primary key,
  user_id     uuid references auth.users(id),
  paper_id    bigint references papers(id),
  amount      int,
  currency    text default 'KRW',
  paid_at     timestamptz default now(),
  provider_ref text
);

create table api_keys (
  id          bigserial primary key,
  user_id     uuid references auth.users(id),
  key_hash    text unique not null,
  name        text,
  tier        text default 'free' check (tier in ('free','dev','business')),
  rate_limit_per_min int default 60,
  monthly_quota int,
  created_at  timestamptz default now(),
  revoked_at  timestamptz
);

-- =========================================================
-- 8. 개인화·커뮤니티·알림
-- =========================================================
create table library_folders (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  is_shared   boolean default false,
  share_token text unique
);
create table library_items (
  folder_id   bigint references library_folders(id) on delete cascade,
  paper_id    bigint references papers(id) on delete cascade,
  note        text,
  tags        text[],
  added_at    timestamptz default now(),
  primary key (folder_id, paper_id)
);

create table follows (                         -- 저자/키워드/저널/연구실 팔로우
  user_id     uuid references auth.users(id) on delete cascade,
  target_type text check (target_type in ('author','keyword','venue','lab','session')),
  target_id   text not null,
  created_at  timestamptz default now(),
  primary key (user_id, target_type, target_id)
);

create table notifications (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  kind        text,
  payload     jsonb,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

create table discussions (                     -- 논문/세션 Q&A
  id          bigserial primary key,
  paper_id    bigint references papers(id) on delete cascade,
  session_id  int references sessions(id),
  parent_id   bigint references discussions(id),
  user_id     uuid references auth.users(id),
  body        text not null,
  is_author_reply boolean default false,
  upvotes     int default 0,
  created_at  timestamptz default now(),
  deleted_at  timestamptz
);

create table ai_conversations (
  id          bigserial primary key,
  user_id     uuid references auth.users(id),
  mode        text check (mode in ('search','paper_qa','deep_research','compare','review')),
  title       text,
  created_at  timestamptz default now()
);
create table ai_messages (
  id          bigserial primary key,
  conversation_id bigint references ai_conversations(id) on delete cascade,
  role        text check (role in ('user','assistant','tool')),
  content     text,
  citations   jsonb,                           -- [{paper_id, chunk_id, page, bbox}]
  tokens_in   int,
  tokens_out  int,
  model       text,
  created_at  timestamptz default now()
);

-- =========================================================
-- 9. 이벤트 로그 (통계·랭킹)  — 월 파티션
-- =========================================================
create table events (
  id          bigserial,
  occurred_at timestamptz not null default now(),
  user_id     uuid,
  anon_id     text,
  institution_id int,
  event       text not null,                   -- view, download, search, ai_query, cite_export
  paper_id    bigint,
  meta        jsonb,
  primary key (id, occurred_at)
) partition by range (occurred_at);
create table events_2026_10 partition of events for values from ('2026-10-01') to ('2026-11-01');

create materialized view paper_rankings as
select paper_id,
       count(*) filter (where event='view' and occurred_at > now() - interval '7 days') as views_7d,
       count(*) filter (where event='download' and occurred_at > now() - interval '30 days') as downloads_30d
from events where paper_id is not null group by paper_id;

-- =========================================================
-- 10. 인제스트 작업 큐
-- =========================================================
create table ingest_jobs (
  id          bigserial primary key,
  paper_id    bigint references papers(id),
  source_file text,
  stage       text check (stage in ('uploaded','parsed','extracted','embedded','enriched','indexed','failed')),
  error       text,
  attempts    smallint default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- =========================================================
-- 11. 접근 제어 함수 + RLS (요지)
-- =========================================================
create or replace function can_access_fulltext(p_user uuid, p_paper bigint)
returns boolean language sql stable as $$
  select exists (select 1 from papers p where p.id = p_paper and p.oa_status in ('diamond','gold','green'))
      or exists (select 1 from profiles pr where pr.user_id = p_user and pr.role in ('member','editor','admin') and (pr.member_valid_until is null or pr.member_valid_until >= current_date))
      or exists (select 1 from subscriptions s where s.user_id = p_user and s.status='active' and s.period_end > now())
      or exists (select 1 from purchases pu where pu.user_id = p_user and pu.paper_id = p_paper)
      or exists (select 1 from profiles pr join institutions i on i.org_id = pr.org_id
                 where pr.user_id = p_user and i.valid_until >= current_date);
$$;

alter table papers enable row level security;
create policy papers_public_read on papers for select using (true);
alter table library_folders enable row level security;
create policy lib_owner on library_folders for all using (auth.uid() = user_id);
alter table library_items enable row level security;
create policy lib_items_owner on library_items for all
  using (exists (select 1 from library_folders f where f.id = folder_id and f.user_id = auth.uid()));
alter table ai_conversations enable row level security;
create policy ai_owner on ai_conversations for all using (auth.uid() = user_id);

-- 시드: 소사이어티
insert into societies (code,name_ko,name_en) values
('COMM','통신','Communications'),('SEMI','반도체','Semiconductor'),('COMP','컴퓨터','Computer'),
('AISP','인공지능신호처리','AI Signal Processing'),('SYSC','시스템및제어','Systems and Control'),('INDE','산업전자','Industrial Electronics');
