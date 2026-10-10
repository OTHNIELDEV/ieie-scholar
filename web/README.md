# IEIE Scholar — web

Next.js 14 (App Router) · Supabase · Typesense(선택) · Claude API

## 시작
```bash
cp .env.example .env.local   # 값 입력
cp ../data/05_database_schema.sql supabase/migrations/0001_init.sql
supabase link --project-ref <ref> && supabase db push
npm install && npm run dev
```

## 구조
- `app/(public)` 홈·검색·논문·간행물·권호(세션 트리)·저자·AI
- `app/api/v1` Open API (search, papers, pdf)
- `app/api/ai/search` 근거 기반 AI 답변 (스트리밍)
- `lib/search` 하이브리드 검색(RRF: Typesense|Postgres FTS + pgvector)
- `lib/ai` 임베딩·프롬프트
- `supabase/migrations` 스키마 + 검색 RPC

Typesense 미설정 시 Postgres FTS로 자동 폴백됩니다. 데이터 적재는 `../pipeline` 참조.
