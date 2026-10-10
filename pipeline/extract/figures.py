"""Figure/Table 추출 — PyMuPDF 이미지 블록 + 캡션 정규식(간이). Docling 레이아웃 모델로 교체 가능.
결과: paper_figures (image_key → R2 figures/{paper}/{n}.png)"""
from __future__ import annotations
import io, re
import fitz
from common import db, r2, CFG

CAP = re.compile(r"^(그림|표|Fig\.?|Figure|Table|TABLE)\s*([IVX\d]+)[\.\s:]", re.I)


def extract(paper_id: int, pdf_bytes: bytes) -> list[dict]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    out = []
    n = 0
    for page in doc:
        blocks = page.get_text("dict")["blocks"]
        caps = []
        for b in blocks:
            if b["type"] == 0:
                txt = " ".join(s["text"] for l in b["lines"] for s in l["spans"]).strip()
                m = CAP.match(txt)
                if m:
                    caps.append({"label": f"{m.group(1)} {m.group(2)}", "caption": txt[:500], "bbox": b["bbox"], "type": "table" if m.group(1).lower().startswith(("표", "tab")) else "figure"})
        for b in blocks:
            if b["type"] != 1:
                continue
            x0, y0, x1, y1 = b["bbox"]
            if (x1 - x0) < 60 or (y1 - y0) < 60:
                continue
            # 가장 가까운 아래쪽 캡션
            cap = min((c for c in caps if c["bbox"][1] >= y1 - 20), key=lambda c: c["bbox"][1] - y1, default=None)
            clip = fitz.Rect(x0, y0, x1, y1)
            pix = page.get_pixmap(clip=clip, dpi=150)
            n += 1
            key = f"figures/{paper_id}/{n}.png"
            r2().upload_fileobj(io.BytesIO(pix.tobytes("png")), CFG["r2"]["bucket"], key, ExtraArgs={"ContentType": "image/png"})
            out.append({"paper_id": paper_id, "fig_type": cap["type"] if cap else "figure", "label": cap["label"] if cap else f"Fig {n}",
                        "caption": cap["caption"] if cap else None, "page": page.number + 1, "bbox": [x0, y0, x1, y1], "image_key": key})
    if out:
        db().table("paper_figures").insert(out).execute()
        db().table("papers").update({"has_figures": True, "has_tables": any(o["fig_type"] == "table" for o in out)}).eq("id", paper_id).execute()
    return out
