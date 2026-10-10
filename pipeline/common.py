"""공용: 설정, Supabase/R2/Claude 클라이언트, 로깅"""
from __future__ import annotations
import os, logging, hashlib, functools
from pathlib import Path
import yaml
from dotenv import load_dotenv

load_dotenv()
ROOT = Path(__file__).parent
CFG = yaml.safe_load((ROOT / "config.yaml").read_text(encoding="utf-8"))
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("pipeline")


@functools.lru_cache
def db():
    from supabase import create_client
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


@functools.lru_cache
def r2():
    import boto3
    return boto3.client("s3", endpoint_url=CFG["r2"]["endpoint"],
                        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"], aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                        region_name="auto")


@functools.lru_cache
def claude():
    import anthropic
    return anthropic.Anthropic()


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def set_stage(paper_id: int, stage: str, error: str | None = None):
    db().table("ingest_jobs").upsert({"paper_id": paper_id, "stage": stage, "error": error}, on_conflict="paper_id").execute()
