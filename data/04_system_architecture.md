# 04. 시스템 아키텍처 제안

> 기술 스택 전제: **Next.js 14 (App Router) · Supabase (Postgres + pgvector + Auth + Storage) · Vercel · Cloudflare · Claude API** — 기존 ExitWise 인프라와 동일 계열로 운영 비용·학습 곡선 최소화

---

## 1. 전체 구성도

```
┌───────────────────────────── Cloudflare ─────────────────────────────┐
│  DNS · WAF · Bot 차단 · R2(원문 PDF/Figure 이미지, 무료 egress)       │
│  Workers(PDF 서명 URL, 다운로드 쿼터 체크) · Turnstile(봇 방지)       │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
        ┌──────────────▼───────────────┐        ┌──────────────────────┐
        │  Vercel — Next.js 14         │        │  검색 엔진            │
        │  · RSC/SSR/ISR 페이지         │◄──────►│  Typesense Cloud      │
        │  · Route Handlers (/api)      │        │  (한/영 형태소·오타·   │
        │  · Edge Middleware(인증/IP)   │        │   facet·동의어)        │
        │  · Streaming AI UI            │        └──────────────────────┘
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────────────────────────────────────┐
        │  Supabase                                                    │
        │  · Postgres 16 + pgvector(HNSW) — 서지·저자·인용·청크 임베딩 │
        │  · Auth (이메일/소셜/ORCID OIDC/기관 SSO-SAML)              │
        │  · Storage (업로드 임시), Realtime(알림), Edge Functions     │
        │  · RLS로 기관/구독 권한 제어                                  │
        └──────────────┬──────────────────────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────────────────────┐
        │  AI 레이어                                                   │
        │  · Claude API (Sonnet: 요약/QA/딥리서치, Haiku: 분류/추출)   │
        │  · 임베딩: Voyage AI(voyage-3-large, 다국어) 또는 bge-m3     │
        │  · Rerank: Cohere Rerank v3 / voyage-rerank                  │
        │  · 프롬프트 캐시 + 배치 API로 비용 절감                       │
        └──────────────┬──────────────────────────────────────────────┘
                       │
        ┌──────────────▼──────────────────────────────────────────────┐
        │  데이터 파이프라인 (Python, 별도 워커 — Railway/Fly.io/GCP)  │
        │  · PDF 파싱(GROBID + marker/Docling + OCR)                   │
        │  · Figure/Table/수식 추출, 참고문헌 파싱 → Crossref 매칭     │
        │  · 저자 명확화, DOI 등록, OpenAlex 동기화                     │
        │  · 큐: Supabase pgmq 또는 Upstash QStash                     │
        └─────────────────────────────────────────────────────────────┘
```

## 2. 레이어별 설계

### 2.1 프론트엔드 (Next.js 14)
| 영역 | 선택 | 이유 |
|------|------|------|
| 렌더링 | 논문 상세·권호·저자 페이지 = **ISR(revalidate 1h)**, 검색 = SSR + 클라이언트 스트리밍 | SEO + 즉시 렌더 (DBpia placeholder 문제 회피) |
| UI | Tailwind + shadcn/ui, Radix | 접근성 기본 확보 |
| 상태 | TanStack Query, nuqs(URL 검색 상태) | 검색 필터 공유 가능 링크 |
| AI UI | Vercel AI SDK `streamText` + 인용 카드 컴포넌트 | 토큰 스트리밍 |
| 수식 | KaTeX, 그림 뷰어 = react-pdf + 자체 Figure 갤러리 | |
| 국제화 | next-intl (ko/en) | 국제대회·JSTS |
| SEO | `citation_*` 메타태그(Google Scholar), JSON-LD ScholarlyArticle, sitemap 분할(5만 URL/파일) | |

### 2.2 검색 (하이브리드)
```
질의 → [Typesense BM25 + facet] ─┐
                                   ├─ RRF 융합 → Rerank(top 50→10) → 결과
질의 → [pgvector 코사인 top 100] ──┘
```
- Typesense 스키마: title_ko, title_en, abstract, keywords, authors, affiliation, venue, year, society, session, has_fulltext, awards
- 동의어 사전: 학회 표준용어(예: "FinFET ↔ 핀펫", "LNA ↔ 저잡음증폭기")
- 임베딩 단위: 논문 요약 1벡터 + 본문 청크(~800토큰) N벡터 + Figure 캡션 벡터
- 대안: pgvector만으로 시작(3만 편 × 30청크 = 90만 벡터, HNSW로 충분) → 트래픽 증가 시 Typesense 추가

### 2.3 AI 기능 구현 패턴
| 기능 | 파이프라인 |
|------|-----------|
| 논문 요약(4종) | 배치 API로 사전 생성 → `paper_summaries` 캐시. 모델: Claude Sonnet, 프롬프트 캐시로 본문 재사용 |
| AI 검색/QA | 하이브리드 검색 top 10 청크 → Claude에 근거 삽입 → 인용 ID 강제 출력(JSON) → 프론트에서 인용 카드 매핑. 근거 없는 문장 생성 금지 지시 |
| 딥리서치 | 계획 수립(Haiku) → 다중 검색(병렬) → 섹션별 작성(Sonnet) → 검증 패스(인용 ID 존재 확인) → 보고서(Markdown/DOCX) |
| 스펙 비교표 | 추출된 Table → 정규화 스키마(metric, value, unit, condition) → 사용자 선택 논문 교차표 |
| 리뷰어 모드 | 업로드 PDF → 임베딩 → 유사 논문 top 20 + 신규성 코멘트 |
| 번역 | 용어집 주입 프롬프트, 문단 단위 캐시 |

비용 가드: 사용자별 월 토큰 쿼터, 캐시 적중률 모니터링, Haiku 우선 라우팅.

### 2.4 인증·권한
- Supabase Auth: 이메일, Google, **ORCID OIDC**, 기관 SSO(SAML — 대학 도서관), IP 대역 인증(Edge Middleware에서 `institution_ip_ranges` 조회)
- RLS 정책: `papers`는 공개, `fulltext_files` 접근은 `can_access_fulltext(user, paper)` 함수(OA 여부·회원·기관·구매 체크)
- 원문 다운로드: Cloudflare Worker가 서명 URL(10분) 발급 + 쿼터/속도 제한

### 2.5 저장소
| 데이터 | 위치 |
|--------|------|
| 원문 PDF, 추출 Figure PNG, 썸네일 | Cloudflare R2 (`papers/{id}/fulltext.pdf`, `figures/{id}/{n}.png`) |
| 서지·관계·임베딩 | Supabase Postgres |
| 검색 인덱스 | Typesense (Postgres가 원본, 변경 시 재색인 트리거) |
| 로그·분석 | Supabase `events` 파티션 테이블 → 월별 집계 → 필요 시 ClickHouse/Tinybird |

### 2.6 관측·운영
- Vercel Analytics + Sentry, Supabase 로그, Cloudflare Analytics
- 비용 추정(3만 편, MAU 2만 기준): Vercel Pro ~$20–150, Supabase Pro ~$25–100, R2 ~$5(100GB), Typesense ~$50, Claude API ~$300–1,500/월(캐시·배치 적용 시) → **월 $500–2,000**

## 3. 보안·컴플라이언스
- ISMS-P 준비(DBpia 보유): 접근통제, 로그 보관 1년, 개인정보 암호화(pgcrypto)
- 대량 다운로드 탐지(사용자·IP별 레이트 리밋, 봇 Turnstile)
- 저작권: 원문 워터마크(다운로드자 이메일 삽입, pdf-lib)
- 백업: Supabase PITR + R2 버전 관리

## 4. 디렉터리 구조 제안 (`web/`)
```
web/
  app/
    (public)/            홈, 검색, 논문, 권호, 저널, 저자, 연구실, 학술대회
    (member)/            내서재, 알림, 프로필 클레임, AI 워크스페이스
    (admin)/             인제스트 큐, 메타 교정, 권한, 통계
    api/
      v1/                Open API (search, papers, authors, citations)
      ai/                stream 핸들러
  components/
  lib/
    search/              typesense + pgvector 클라이언트, RRF
    ai/                  프롬프트, 툴, 인용 검증
    db/                  supabase 타입(generated), 쿼리
  supabase/
    migrations/          05_database_schema.sql 기반
    functions/           edge functions
pipeline/                Python 워커 (07_data_pipeline.md)
```
