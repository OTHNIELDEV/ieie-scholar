# 시드 데이터 (Crossref, DOI prefix 10.5573)

대한전자공학회가 Crossref에 등록한 DOI 논문 4,817편의 공개 서지 (2026-10-10 수집).

| 파일 | 행 | 내용 |
|---|---|---|
| seed_papers.json | 4,817 | DOI·제목·간행물(j-ieie/jsts/ieie-spc)·권호·페이지·발행일·피인용수 |
| seed_authors.json | 15,234 | 논문별 저자 표기·소속·ORCID |
| seed_refs.json | 10,726 | 참고문헌(Crossref 제공분) |

초록·키워드·원문은 Crossref 메타에 없음 → `pipeline/`로 PDF 적재 시 채워짐. 적재 SQL은 `web/supabase/migrations/0003_seed_crossref.sql` 참조.
