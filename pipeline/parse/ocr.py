"""스캔본 OCR — Tesseract(kor+eng) 기본, 상용 API(Upstage/CLOVA) 교체 지점"""
from __future__ import annotations
import fitz  # pymupdf


def ocr_pdf(pdf_bytes: bytes, dpi: int = 300, lang: str = "kor+eng") -> list[str]:
    import pytesseract
    from PIL import Image
    import io
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pix = page.get_pixmap(dpi=dpi)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        pages.append(pytesseract.image_to_string(img, lang=lang))
    return pages


def make_searchable(pdf_bytes: bytes, lang: str = "kor+eng") -> bytes:
    """OCR 텍스트 레이어를 입힌 PDF 생성(PyMuPDF OCR — tesseract 필요)"""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    out = fitz.open()
    for page in doc:
        tp = page.get_textpage_ocr(language=lang, dpi=300, full=True)
        out.insert_pdf(doc, from_page=page.number, to_page=page.number)
    return out.tobytes()
