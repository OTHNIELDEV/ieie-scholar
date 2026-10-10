# 07. 데이터 수집·정제·적재 파이프라인

> 목표: 3만 편 원문 PDF → 구조화 메타 + 청크 임베딩 + Figure/Table + 참고문헌/인용 그래프 + 저자 명확화, **자동화율 90%+, 사람 검수 10% 이하**

---

## 1. 소스 확보 전략

| 소스 | 내용 | 확보 방법 | 비고 |
|------|------|-----------|------|
| 학회 자체 보유 | 최근 10~15년 학술대회·논문지 born-digital PDF, 투고시스템 메타 | 학회 사무국 전달(외장/클라우드) | 1순위 |
| DBpia 디지털화본 | 1960~2000년대 스캔본 | **계약 검토 후** 반환/재제공 요청 | 권리 확인 |
| KCI | 논문지 서지·초록·참고문헌·인용 | KCI Open API (공개) | 무료 |
| KoreaScience(KISTI) | 전자공학회논문지 SD/SP/… 서지+일부 원문 | KoreaScience Open API | 무료 |
| Crossref | DOI 메타, 참고문헌, 피인용 | REST API (무료, polite pool) | |
| OpenAlex | 저자·기관·인용·개념 | API (무료) | ROR·ORCID 연계 |
| Semantic Scholar | 인용 문맥, 영향력 인용 | API (키 신청) | 영문 위주 |
| ORCID / KRI | 저자 식별 | 공개 API | |
| 학회 행사 데이터 | 세션·트랙·수상·프로그램 | 사무국 엑셀/프로그램북 PDF 파싱 | ★ 독점 메타 |

## 2. 파이프라인 단계

```
[1 수집] → [2 파싱] → [3 구조화] → [4 추출(Fig/Tab/Eq/Ref)] → [5 보강(DOI/인용/저자)] → [6 임베딩] → [7 색인] → [8 QA/검수]
```

### 단계 1. 수집 (ingest)
- 입력: PDF + (있다면) 메타 CSV/XML(투고시스템 export)
- R2 업로드 `raw/{venue}/{year}/{file}.pdf`, SHA-256 중복 제거, `ingest_jobs` 생성
- 스캔본 판별: 텍스트 레이어 유무(pdfplumber) → OCR 큐 분기

### 단계 2. 파싱
| 도구 | 역할 | 비고 |
|------|------|------|
| **GROBID** | 헤더(제목·저자·소속·초록·키워드), 본문 섹션, 참고문헌 TEI | 학술 PDF 표준, 한글 헤더 정확도 보완 필요 |
| **marker / Docling** | PDF→Markdown(레이아웃 보존), 표·수식(LaTeX) 추출 | GROBID 보완 |
| **OCR** | 스캔본: Tesseract(kor+eng) 또는 Upstage Document OCR / Naver CLOVA OCR | 한글 스캔 정확도는 상용 API가 유리 |
| **Claude (Haiku/Sonnet)** | 파싱 실패·저품질 헤더의 메타 재추출(첫 2쪽 → JSON), 한글 저자/소속 분리 | 비용: 2쪽 × 3만 편 ≈ 수십 달러 |

출력: `papers`(기본 메타), `paper_sections`, `references_raw`

### 단계 3. 구조화·정규화
- 제목/초록 한·영 분리, 키워드 분리(;, ·, , 처리), 페이지 범위
- 간행물 매핑: 파일명/폴더/메타 → `venues`, `issues` (50종 매핑 테이블)
- 학술대회 세션 매핑: 프로그램북 파싱(표 추출) → `sessions` → 논문 제목 fuzzy 매칭(rapidfuzz ≥ 0.9)
- 기술분류: Claude Haiku로 소사이어티/세부분류 다중 라벨 분류(few-shot + 학회 분류표) → `subject_ids`
- 품질 플래그: 초록 없음, 저자 0명, 페이지 불일치 등 → 검수 큐

### 단계 4. Figure / Table / Equation 추출
- **PDFFigures2** 또는 Docling 레이아웃 모델 → figure/table bbox + 캡션
- 이미지 크롭(PyMuPDF) → R2 `figures/{paper}/{n}.png` (+ WebP 썸네일)
- 표: Docling TableFormer → JSON 행렬 → `paper_figures.extracted_data`
- 수식: marker LaTeX → `chunk_type='equation'`
- 성능 지표 추출(★): 표 JSON + 캡션 → Claude Sonnet "metric/value/unit/condition" JSON → `paper_specs` (신뢰도 < 0.7은 미노출)

### 단계 5. 보강 (enrichment)
1. **DOI**: 기존 DOI 조회(Crossref `query.bibliographic`) → 없으면 Crossref 회원 가입 후 신규 등록(XML 배치, 건당 $1 → 3만 편 약 $30k; **학술대회 논문은 선택적**/논문지 우선)
2. **참고문헌 매칭**: `references_raw.parsed` → Crossref/OpenAlex 매칭 → 내부 논문이면 `matched_paper_id` → `citations(source=internal)`
3. **피인용**: Crossref cited-by, OpenAlex `cited_by_api_url`, KCI 인용 → `citations` 병합, `papers.citation_count` 갱신(일 1회)
4. **저자 명확화**(★ 핵심):
   - 블로킹: 성명 정규화(한글/로마자 변환 매핑, 공백·하이픈 제거)
   - 피처: 소속 유사도, 공저자 중복, 연도 근접, 이메일 도메인, 주제 벡터 유사도, ORCID/KRI 일치
   - 모델: 규칙 + LightGBM 쌍분류 → 그래프 클러스터링(연결요소)
   - 임계값 ≥0.85 자동 병합, 0.6~0.85 검수 큐, 클레임 시 사용자 확정
5. **기관 정규화**: ROR 매칭 + 학회 소속 사전(대학 약칭·영문명)
6. **코드/데이터셋 링크**: 본문 URL 정규식(github.com, huggingface, ieee-dataport, zenodo) → HEAD 체크

### 단계 6. 임베딩
- 청킹: 섹션 경계 우선, ~800토큰, 100토큰 오버랩, 표·캡션·수식은 독립 청크
- 모델: **voyage-3-large**(다국어, 1024d) 또는 자체 호스팅 **bge-m3**(무료, 한글 양호)
- 논문 대표 벡터: 제목+초록+키워드
- 비용: 3만 편 × ~15k토큰 = 4.5억 토큰 → Voyage 기준 약 $50~100 (초기 1회)

### 단계 7. 색인
- Postgres 트리거 → Typesense upsert(검색 필드 + facet), pgvector HNSW
- ISR 재검증: 논문·권호·저자 페이지 `revalidateTag`

### 단계 8. AI 사전 생성 & QA
- 요약 5종 배치 생성(Claude Batch API 50% 할인, 프롬프트 캐시) → `paper_summaries`
- 자동 QA: 메타 완전성 점수, 참고문헌 파싱률, 샘플 100편 사람 검수 → 정확도 리포트
- 관리자 교정 UI → 수정 이력 저장

## 3. 처리량·일정 추정 (3만 편)
| 단계 | 단위 처리 | 총 소요(병렬 8워커) |
|------|-----------|---------------------|
| GROBID+Docling | ~6초/편 | ~6시간 |
| OCR(스캔본 30% 가정, 9천 편) | ~40초/편 | ~12시간 |
| Figure 추출 | ~4초/편 | ~4시간 |
| 임베딩 | API 배치 | ~3시간 |
| Crossref/OpenAlex 보강 | 레이트 리밋 50rps | ~1일 |
| AI 요약 배치 | Batch API | ~1일 |
| 저자 명확화 | 전체 배치 | ~2시간 + 검수 2주 |
→ **기계 처리 1주, 검수 포함 4~6주**

## 4. 증분 운영 (학술대회 당일 등재 ★)
- 투고시스템(JAMS/EDAS/OpenConf) → 채택 논문 camera-ready PDF + 세션 배정 export → 파이프라인 자동 → 대회 D-7 비공개 적재 → 개회 시 공개 플래그 ON
- 저널: 게재 확정 즉시 등재 + DOI 등록

## 5. 코드 스켈레톤 (`pipeline/`)
```
pipeline/
  ingest/      r2 업로드, 중복 검사, 잡 생성
  parse/       grobid_client.py, docling_runner.py, ocr.py, claude_header_fix.py
  structure/   venue_mapper.py, session_matcher.py, classifier.py
  extract/     figures.py, tables.py, equations.py, specs_llm.py
  enrich/      crossref.py, openalex.py, kci.py, author_disambig.py, ror.py, links.py
  embed/       chunker.py, voyage.py
  index/       typesense_sync.py
  qa/          completeness.py, sample_review_export.py
  worker.py    pgmq 소비 루프
  config.yaml
```
- 언어: Python 3.12, 의존: grobid-client, docling, pymupdf, rapidfuzz, httpx, supabase-py, voyageai, anthropic
- 실행 환경: Fly.io/Railway 컨테이너(GROBID 포함, 4vCPU/8GB) 또는 GCP Cloud Run Jobs
