"""GROBID: 헤더(제목/저자/소속/초록/키워드) + 본문 섹션 + 참고문헌 (TEI XML → dict)"""
from __future__ import annotations
import httpx
from lxml import etree
from common import CFG

NS = {"t": "http://www.tei-c.org/ns/1.0"}


def process(pdf_bytes: bytes, consolidate: bool = False) -> dict:
    r = httpx.post(f"{CFG['grobid_url']}/api/processFulltextDocument",
                   files={"input": ("f.pdf", pdf_bytes, "application/pdf")},
                   data={"consolidateHeader": "1" if consolidate else "0", "includeRawCitations": "1", "segmentSentences": "0"},
                   timeout=180)
    r.raise_for_status()
    return parse_tei(r.text)


def _t(el):
    return " ".join(el.itertext()).strip() if el is not None else None


def parse_tei(xml: str) -> dict:
    root = etree.fromstring(xml.encode())
    hdr = root.find(".//t:teiHeader", NS)
    title = _t(hdr.find(".//t:titleStmt/t:title", NS))
    abstract = _t(hdr.find(".//t:profileDesc/t:abstract", NS))
    keywords = [_t(k) for k in hdr.findall(".//t:keywords/t:term", NS)]
    authors = []
    for a in hdr.findall(".//t:sourceDesc//t:author", NS):
        pers = a.find("t:persName", NS)
        if pers is None:
            continue
        name = " ".join(filter(None, [_t(pers.find("t:forename", NS)), _t(pers.find("t:surname", NS))]))
        aff = _t(a.find(".//t:affiliation", NS))
        email = _t(a.find("t:email", NS))
        authors.append({"name": name, "affiliation": aff, "email": email})
    sections = []
    for i, div in enumerate(root.findall(".//t:text/t:body/t:div", NS)):
        head = div.find("t:head", NS)
        paras = [_t(p) for p in div.findall("t:p", NS)]
        sections.append({"position": i, "heading": _t(head), "level": int(head.get("n", "1").count(".") + 1) if head is not None and head.get("n") else 1,
                         "text": "\n".join(p for p in paras if p)})
    refs = []
    for i, b in enumerate(root.findall(".//t:listBibl/t:biblStruct", NS)):
        raw = b.find(".//t:note[@type='raw_reference']", NS)
        doi = b.find(".//t:idno[@type='DOI']", NS)
        refs.append({"position": i, "raw_text": _t(raw) or _t(b), "parsed": {
            "title": _t(b.find(".//t:analytic/t:title", NS)) or _t(b.find(".//t:monogr/t:title", NS)),
            "year": (b.find(".//t:date", NS).get("when") if b.find(".//t:date", NS) is not None else None),
            "doi": _t(doi), "venue": _t(b.find(".//t:monogr/t:title", NS)),
            "authors": [" ".join(filter(None, [_t(p.find("t:forename", NS)), _t(p.find("t:surname", NS))])) for p in b.findall(".//t:author/t:persName", NS)],
        }})
    figs = []
    for f in root.findall(".//t:figure", NS):
        figs.append({"type": "table" if f.get("type") == "table" else "figure", "label": _t(f.find("t:label", NS)), "caption": _t(f.find("t:figDesc", NS))})
    return {"title": title, "abstract": abstract, "keywords": keywords, "authors": authors, "sections": sections, "references": refs, "figures": figs}
