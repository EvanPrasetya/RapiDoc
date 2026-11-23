import re
from typing import Dict, List, Optional, Tuple, Iterator, Any
from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table
from docx.oxml.ns import qn


MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006"
MC_FALLBACK = f"{{{MC_NS}}}Fallback"
MC_ALTERNATE_CONTENT = f"{{{MC_NS}}}AlternateContent"


def _walk_body_elements(container_el, parent) -> Iterator[Tuple[str, Any]]:
    """
    Recursively walk OOXML body elements (including <w:sdt>/<w:sdtContent> content controls)
    and yield ('paragraph', Paragraph) or ('table', Table) in exact document reading order.
    """
    for child in container_el:
        tag = child.tag
        if tag == qn("w:p"):
            yield ("paragraph", Paragraph(child, parent))
        elif tag == qn("w:tbl"):
            yield ("table", Table(child, parent))
        elif tag == qn("w:sdt"):
            sdt_content = child.find(qn("w:sdtContent"))
            if sdt_content is not None:
                yield from _walk_body_elements(sdt_content, parent)


def iter_document_blocks(doc: Document) -> Iterator[Tuple[str, Any, int]]:
    """
    Yield ('paragraph', Paragraph, p_idx) or ('table', Table, tbl_idx) in exact Word XML order.
    Preserves interleaved positions of paragraphs and tables (plus <w:sdt> content controls).
    """
    p_idx = 0
    tbl_idx = 0
    for kind, obj in _walk_body_elements(doc.element.body, doc):
        if kind == "paragraph":
            yield ("paragraph", obj, p_idx)
            p_idx += 1
        else:
            yield ("table", obj, tbl_idx)
            tbl_idx += 1


def _extract_runs_from_element(
    el, inherited_bold: bool = False, inherited_italic: bool = False
) -> List[Dict[str, Any]]:
    """
    Recursively collect visible runs from a paragraph XML subtree:
    handles <w:r>, <w:hyperlink>, <w:sdt>/<w:sdtContent>, <w:ins>, <w:smartTag>,
    <w:txbxContent> textboxes, <w:tab/>, <w:cr/>, and non-page <w:br/>.
    Skips <mc:Fallback> so Word alternate-content shapes aren't duplicated.
    """
    runs: List[Dict[str, Any]] = []
    tag = el.tag

    if tag == MC_FALLBACK or tag == qn("w:del"):
        return runs

    if tag == qn("w:r"):
        rPr = el.find(qn("w:rPr"))
        is_bold = inherited_bold
        is_italic = inherited_italic
        if rPr is not None:
            b_el = rPr.find(qn("w:b"))
            if b_el is not None:
                val = (b_el.get(qn("w:val")) or "1").lower()
                is_bold = val not in {"0", "false"}
            i_el = rPr.find(qn("w:i"))
            if i_el is not None:
                val = (i_el.get(qn("w:val")) or "1").lower()
                is_italic = val not in {"0", "false"}

        text_parts: List[str] = []
        for child in el:
            ctag = child.tag
            if ctag == qn("w:t"):
                if child.text:
                    text_parts.append(child.text)
            elif ctag == qn("w:tab"):
                text_parts.append("\t")
            elif ctag == qn("w:br"):
                br_type = child.get(qn("w:type"))
                if br_type != "page":
                    text_parts.append("\n")
            elif ctag == qn("w:cr"):
                text_parts.append("\n")
            elif ctag == qn("w:noBreakHyphen"):
                text_parts.append("-")
            elif ctag in {qn("w:drawing"), qn("w:pict"), MC_ALTERNATE_CONTENT}:
                # Also inspect any nested textboxes (<w:txbxContent>) inside shapes/drawings
                tbx_runs = _extract_runs_from_element(child, is_bold, is_italic)
                if tbx_runs:
                    if text_parts:
                        runs.append({"text": "".join(text_parts), "bold": is_bold, "italic": is_italic})
                        text_parts = []
                    runs.extend(tbx_runs)

        if text_parts:
            runs.append({"text": "".join(text_parts), "bold": is_bold, "italic": is_italic})
        return runs

    # Handle <w:txbxContent> (paragraphs inside a Word text box)
    if tag == qn("w:txbxContent"):
        first_p = True
        for child in el:
            if child.tag == qn("w:p"):
                sub_runs = _extract_runs_from_element(child, inherited_bold, inherited_italic)
                if sub_runs:
                    if not first_p:
                        runs.append({"text": "\n", "bold": False, "italic": False})
                    runs.extend(sub_runs)
                    first_p = False
            else:
                runs.extend(_extract_runs_from_element(child, inherited_bold, inherited_italic))
        return runs

    for child in el:
        runs.extend(_extract_runs_from_element(child, inherited_bold, inherited_italic))
    return runs


def extract_paragraph_runs_full(p: Paragraph) -> List[Dict[str, Any]]:
    """Return full list of runs from a Paragraph including hyperlinks, SDTs, and textboxes."""
    return _extract_runs_from_element(p._p)


def extract_paragraph_text_full(p: Paragraph) -> str:
    """Return complete visible text of a Paragraph including hyperlinks, SDTs, tabs, line breaks, and textboxes."""
    runs = _extract_runs_from_element(p._p)
    if runs:
        return "".join(r["text"] for r in runs)
    return p.text or ""


def detect_word_list_kind(doc: Document, p: Paragraph) -> Optional[str]:
    """
    Inspect <w:numPr> and numbering.xml to distinguish Word numbered lists ('list_number')
    from bullet lists ('list_bullet'). Returns None if the paragraph is not a native Word list.
    """
    pPr = p._p.pPr
    if pPr is None:
        return None
    numPr = pPr.find(qn("w:numPr"))
    if numPr is None:
        return None

    numId_el = numPr.find(qn("w:numId"))
    ilvl_el = numPr.find(qn("w:ilvl"))
    num_id = numId_el.get(qn("w:val")) if numId_el is not None else None
    ilvl = ilvl_el.get(qn("w:val")) if ilvl_el is not None else "0"

    if num_id and num_id != "0":
        try:
            numbering_part = doc.part.numbering_part
            numbering_el = numbering_part.numbering_definitions._numbering
            abs_id = None
            for num_el in numbering_el.findall(qn("w:num")):
                if num_el.get(qn("w:numId")) == str(num_id):
                    abs_ref = num_el.find(qn("w:abstractNumId"))
                    if abs_ref is not None:
                        abs_id = abs_ref.get(qn("w:val"))
                    break
            if abs_id is not None:
                for abs_el in numbering_el.findall(qn("w:abstractNum")):
                    if abs_el.get(qn("w:abstractNumId")) == str(abs_id):
                        for lvl_el in abs_el.findall(qn("w:lvl")):
                            if lvl_el.get(qn("w:ilvl")) == str(ilvl):
                                fmt_el = lvl_el.find(qn("w:numFmt"))
                                if fmt_el is not None:
                                    fmt_val = (fmt_el.get(qn("w:val")) or "").lower()
                                    if fmt_val == "bullet":
                                        return "list_bullet"
                                    if fmt_val in {
                                        "decimal",
                                        "lowerletter",
                                        "upperletter",
                                        "lowerroman",
                                        "upperroman",
                                    }:
                                        return "list_number"
                        break
        except Exception:
            pass

    style_name = (p.style.name if p.style else "").lower()
    if "number" in style_name or "angka" in style_name:
        return "list_number"
    return "list_bullet"


def split_glued_cover_text(text: str) -> List[str]:
    """
    Split glued cover/signature text where Word line breaks were collapsed or omitted, e.g.:
    'PROGRAM STUDI TEKNIK INFORMATIKAfakultas teknologi informasi dan komunikasiUNIVERSITAS SEMARANG2026'
    'Semarang, November 2026Penulis'
    """
    s = text.strip()
    if not s:
        return []

    # 1. Insert newline before lowercase cover keywords glued after uppercase
    s = re.sub(
        r"(?<=[A-Za-z])(?=(?:fakultas|universitas|institut|politeknik|program studi|prodi|jurusan|departemen)\b)",
        "\n",
        s,
    )
    # 2. Insert newline before UPPERCASE cover keywords glued after lowercase/letter
    s = re.sub(
        r"(?<=[a-z])(?=(?:FAKULTAS|UNIVERSITAS|INSTITUT|POLITEKNIK|SEKOLAH\s+TINGGI|PROGRAM\s+STUDI|PRODI|JURUSAN|DEPARTEMEN)\b)",
        "\n",
        s,
    )
    # 3. Insert newline before trailing 4-digit year glued directly to letters (e.g. 'UNIVERSITAS SEMARANG2026')
    s = re.sub(r"(?<=[A-Za-z])(?=(?:20\d{2})\b)", "\n", s)
    # 3b. If line is an institution block (starts with Program Studi/Prodi/Jurusan/Departemen/Fakultas/Himpunan/BEM), split space-separated Fakultas/Universitas and trailing year onto their own lines
    if re.match(
        r"^\s*(?:program\s+studi|prodi|jurusan|departemen|fakultas|himpunan|bem)\b",
        s,
        re.IGNORECASE,
    ):
        s = re.sub(
            r"(?<=\S)\s+(?=(?:fakultas|universitas|institut|politeknik|sekolah\s+tinggi)\b)",
            "\n",
            s,
            flags=re.IGNORECASE,
        )
        s = re.sub(r"(?<=[A-Za-z])\s+(?=(?:20\d{2})\s*$)", "\n", s)
    # 4. Insert newline between '2026' and 'Penulis'/'Penyusun'
    s = re.sub(
        r"(?<=20\d{2})\s*(?=(?:Penulis|Penyusun|Tim\s+Penyusun)\b)",
        "\n",
        s,
        flags=re.IGNORECASE,
    )
    # 5. Insert newline after 'Menyetujui,' if glued directly to 'Dosen Pembimbing...'
    s = re.sub(
        r"(?i)(Menyetujui\s*,)\s*(?=[A-Za-z])",
        r"\1\n",
        s,
    )

    out: List[str] = []
    for part in s.splitlines():
        cleaned = part.strip()
        if cleaned:
            out.append(cleaned)
    return out
