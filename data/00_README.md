# 대한전자공학회(IEIE) 논문 DB 플랫폼 구축 제안 자료집

> 작성일: 2026-10-10 | 목적: dbpia.com 정밀 분석을 바탕으로 **3만 편 이상의 대한전자공학회 논문**을 서비스하는 독자 플랫폼(가칭 **IEIE Scholar**) 설계 근거 제공

## 문서 구성

| # | 파일 | 내용 |
|---|------|------|
| 01 | `01_dbpia_analysis.md` | DBpia 서비스 구조·기능·요금·AI·데이터 규모 정밀 분석, 강점/약점 |
| 02 | `02_ieie_content_inventory.md` | 대한전자공학회 간행물 현황(50종), 논문 규모 추정, 콘텐츠 분류 체계 |
| 03 | `03_differentiation_strategy.md` | DBpia 대비 차별화 전략 10가지 + 포지셔닝 |
| 04 | `04_system_architecture.md` | 기술 아키텍처(Next.js 14 · Supabase · Vercel · Cloudflare · Claude API) |
| 05 | `05_database_schema.sql` | PostgreSQL/pgvector 스키마 (바로 Supabase 마이그레이션 가능) |
| 06 | `06_feature_spec.md` | 화면·기능 명세 (검색, 논문 상세, AI, 인용, 마이라이브러리, 관리자, Open API) |
| 07 | `07_data_pipeline.md` | PDF→메타데이터→임베딩 수집/정제/적재 파이프라인 |
| 08 | `08_business_model.md` | 요금제·수익모델·B2B 전략 |
| 09 | `09_roadmap.md` | MVP→V1→V2 단계별 로드맵, 인력·비용 추정 |
| 10 | `10_sources.md` | 조사 출처 목록 |
| — | `dbpia_feature_matrix.csv` | DBpia vs 제안 플랫폼 기능 비교 매트릭스 (스프레드시트용) |
| — | `ieie_publications.csv` | 대한전자공학회 간행물 50종 목록 (DBpia 등재 기준) |

## 한 줄 결론

DBpia는 **범용 종합 DB(520만 편)** 로서 "넓이"에서는 이길 수 없다. 따라서 승부처는 **(1) 전자공학 도메인 특화 깊이**, **(2) 원문 전체를 활용한 AI 리서치 품질**, **(3) 학회 직영이기에 가능한 가격·개방성(Open Access + 저렴한 API)**, **(4) 저자·연구실·기업 중심의 네트워크 기능** 4가지다.

## 권장 읽기 순서
01 → 03 → 06 → 04 → 05 → 07 → 08 → 09
