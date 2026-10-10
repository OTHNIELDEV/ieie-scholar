# IEIE Scholar — pipeline

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt            # + pip install ".[parse,ocr]" 로 GROBID/Docling/Tesseract
docker run -d -p 8070:8070 lfoppiano/grobid:0.8.1
cp .env.example .env

python seed_venues.py                                        # 간행물 50종
python -m ingest.upload --venue conf-summer --year 2025 --dir ./raw/2025_summer --meta meta.csv
python worker.py --once                                      # uploaded→parsed→extracted→embedded→enriched→indexed
python -m structure.session_matcher --issue <issue_id> --csv program_2025_summer.csv
python -m enrich.author_disambig
python summarize.py                                          # Claude Batch 요약 5종
python -m qa.completeness
```

단계와 테이블 매핑은 `../data/07_data_pipeline.md` 참조. `worker.py`는 `ingest_jobs.stage`를 큐로 사용하므로 여러 프로세스를 병렬 실행해도 됩니다.
