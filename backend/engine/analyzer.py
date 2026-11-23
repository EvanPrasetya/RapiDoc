from typing import Dict, Any, List, Optional
import re
import math
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from .markdown_parser import (
    ROMAN_CHAPTER_RE,
    SUBCHAPTER_RE,
    LETTER_SUBHEAD_RE,
    SPECIAL_H1_TITLES,
    CV_SECTION_HEADERS,
    JOURNAL_SECTION_HEADERS,
    PROPOSAL_SECTION_HEADERS,
    WORK_REPORT_SECTION_HEADERS,
    ACADEMIC_COVER_PRESETS,
    extract_image_data_uri_from_paragraph,
)
from .ooxml_reader import (
    iter_document_blocks,
    extract_paragraph_text_full,
    detect_word_list_kind,
)


ALIGN_MAP_REVERSE = {
    WD_ALIGN_PARAGRAPH.LEFT: "left",
    WD_ALIGN_PARAGRAPH.CENTER: "center",
    WD_ALIGN_PARAGRAPH.RIGHT: "right",
    WD_ALIGN_PARAGRAPH.JUSTIFY: "justify",
}

TOC_LINE_RE = re.compile(r"^.+?\.{2,}\s*(?:[ivxlcdm]+|\d+)\s*$", re.IGNORECASE)
TOC_SPACE_NUM_RE = re.compile(
    r"^(?:LEMBAR PENGESAHAN|KATA PENGANTAR|DAFTAR ISI|DAFTAR PUSTAKA|HALAMAN JUDUL|BAB\s+[IVXLCDM0-9]+\b.+|\d+\.\d+(?:\.\d+)?\b.+?)\s{2,}(?:[ivxlcdm]+|\d+)\s*$",
    re.IGNORECASE,
)


def _cm_from_emu(emu_val) -> float | None:
    if emu_val is None:
        return None
    return round(float(emu_val) / 360000.0, 2)


def _pt_from_emu(emu_val) -> float | None:
    if emu_val is None:
        return None
    return round(float(emu_val) / 12700.0, 1)


def classify_paragraph_role(
    p, text: str, preset_id: str = "makalah", doc: Optional[Document] = None
) -> str:
    """Determine semantic role of a paragraph: h1, h2, h3, toc_item, list_bullet, list_number, body."""
    style_name = (p.style.name if p.style else "Normal").lower()
    stripped = text.strip()
    upper = stripped.upper().rstrip(":")

    # Never classify a Table of Contents line as a chapter/subchapter heading
    if (
        TOC_LINE_RE.match(stripped)
        or re.search(r"\.{2,}\s*(?:[ivxlcdm]+|\d+)\s*$", stripped, re.IGNORECASE)
        or TOC_SPACE_NUM_RE.match(stripped)
    ):
        return "toc_item"

    # Check custom tag set by formatter / Word style ID
    pPr = p._p.pPr
    if pPr is not None:
        pStyle = pPr.find(qn("w:pStyle"))
        if pStyle is not None:
            val = (pStyle.get(qn("w:val")) or "").lower()
            if "heading1" in val:
                return "h1"
            if "heading2" in val:
                return "h2"
            if "heading3" in val:
                return "h3"

    if "heading 1" in style_name or "judul 1" in style_name:
        return "h1"
    if "heading 2" in style_name or "judul 2" in style_name:
        return "h2"
    if "heading 3" in style_name or "judul 3" in style_name:
        return "h3"
    if "list bullet" in style_name or stripped.startswith(("• ", "- ", "* ")):
        return "list_bullet"
    if "list number" in style_name or re.match(r"^(\d+|[a-z])[\.\)]\s+", stripped):
        return "list_number"

    if doc is not None:
        list_kind = detect_word_list_kind(doc, p)
        if list_kind:
            return list_kind
    elif pPr is not None and pPr.find(qn("w:numPr")) is not None:
        return "list_bullet"

    if preset_id == "cv_ats" and upper in CV_SECTION_HEADERS:
        return "h1"

    if preset_id == "jurnal_artikel" and upper in JOURNAL_SECTION_HEADERS:
        return "h1"

    if preset_id == "proposal" and upper in PROPOSAL_SECTION_HEADERS:
        return "h1"

    if preset_id == "laporan_kerja" and upper in WORK_REPORT_SECTION_HEADERS:
        return "h2"

    first_line = stripped.splitlines()[0].strip() if stripped else ""
    if first_line.upper() in SPECIAL_H1_TITLES and (
        preset_id in ACADEMIC_COVER_PRESETS or preset_id == "jurnal_artikel"
    ):
        return "h1"
    if ROMAN_CHAPTER_RE.match(first_line) and len(first_line) < 90:
        return "h1"

    m_sub = SUBCHAPTER_RE.match(stripped)
    if m_sub and len(stripped) < 120 and not stripped.endswith("."):
        return "h3" if m_sub.group(1).count(".") >= 2 else "h2"

    m_let = LETTER_SUBHEAD_RE.match(stripped)
    if m_let and len(stripped) < 85 and not stripped.endswith("."):
        return "h2"

    return "body"


def analyze_docx(doc: Document, preset: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inspect a python-docx Document in exact OOXML reading order (paragraphs + interleaved tables + SDTs).
    Returns findings, stats, and paginated preview pages with p_idx / table_idx for live editing.
    """
    findings: List[Dict[str, Any]] = []

    preset_id = preset.get("id", "makalah")
    target_font = preset["font_name"]
    target_size = float(preset["font_size_pt"])
    target_spacing = float(preset["line_spacing"])
    target_align = preset["alignment"]
    target_indent_cm = float(preset["first_line_indent_cm"])
    cover_style = preset.get("cover_style", "academic_makalah")

    # 1. Check Section Margins & Page Size
    if doc.sections:
        sec0 = doc.sections[0]
        top_cm = _cm_from_emu(sec0.top_margin) or 2.54
        bottom_cm = _cm_from_emu(sec0.bottom_margin) or 2.54
        left_cm = _cm_from_emu(sec0.left_margin) or 2.54
        right_cm = _cm_from_emu(sec0.right_margin) or 2.54

        exp_top = float(preset["margin_top_cm"])
        exp_bottom = float(preset["margin_bottom_cm"])
        exp_left = float(preset["margin_left_cm"])
        exp_right = float(preset["margin_right_cm"])

        if (
            abs(top_cm - exp_top) > 0.15
            or abs(bottom_cm - exp_bottom) > 0.15
            or abs(left_cm - exp_left) > 0.15
            or abs(right_cm - exp_right) > 0.15
        ):
            findings.append(
                {
                    "id": "sec-margin",
                    "location": "Margin Halaman",
                    "rule": "margins",
                    "severity": "warning",
                    "message": (
                        f"Margin dokumen saat ini {top_cm:g}-{left_cm:g}-{bottom_cm:g}-{right_cm:g} cm "
                        f"(Atas-Kiri-Bawah-Kanan), seharusnya {exp_top:g}-{exp_left:g}-{exp_bottom:g}-{exp_right:g} cm."
                    ),
                    "snippet": f"Preset {preset['name']}",
                }
            )

    if preset.get("use_roman_front_matter") and len(doc.sections) < 2:
        findings.append(
            {
                "id": "sec-numbering",
                "location": "Penomoran Halaman",
                "rule": "page_numbering",
                "severity": "info",
                "message": "Belum ada pemisah Section Break untuk membedakan nomor halaman Romawi (i, ii) dan Arab (1, 2).",
                "snippet": "Section awal & isi masih tergabung",
            }
        )

    xml_str = doc.element.xml
    has_toc_field = "TOC \\o" in xml_str
    if preset.get("include_toc") and not has_toc_field:
        findings.append(
            {
                "id": "doc-toc",
                "location": "Daftar Isi",
                "rule": "toc",
                "severity": "info",
                "message": "Dokumen belum memiliki Daftar Isi (Word TOC Field) otomatis.",
                "snippet": "Disarankan menyisipkan Daftar Isi otomatis sebelum BAB I",
            }
        )

    # 2. Interleaved Block Audit (Paragraphs + Tables in exact XML order)
    non_empty_idx = 0
    heading_count = 0
    word_count = 0
    table_count = 0
    structured_blocks: List[Dict[str, Any]] = []

    default_style_font = None
    default_style_size = None
    try:
        normal_style = doc.styles["Normal"]
        if normal_style and normal_style.font:
            default_style_font = normal_style.font.name
            default_style_size = _pt_from_emu(normal_style.font.size)
    except Exception:
        pass

    in_cover_zone = cover_style in {
        "academic_makalah",
        "academic_skripsi",
        "academic_magang",
        "proposal_cover",
    }
    in_toc_zone = False
    in_bibliography = False
    seen_first_h1_in_cv = False

    for kind, obj, raw_idx in iter_document_blocks(doc):
        if kind == "table":
            tbl = obj
            table_count += 1
            rows_data = []
            for row in tbl.rows:
                rows_data.append([cell.text.strip() for cell in row.cells])
            if rows_data:
                structured_blocks.append(
                    {
                        "type": "table",
                        "table_idx": raw_idx,
                        "rows": rows_data,
                    }
                )
            continue

        p = obj
        has_page_break = False
        if "w:br" in p._p.xml and 'w:type="page"' in p._p.xml:
            has_page_break = True
        if "w:sectPr" in p._p.xml:
            has_page_break = True

        has_image = "w:drawing" in p._p.xml or "w:pict" in p._p.xml
        image_src = extract_image_data_uri_from_paragraph(p) if has_image else None

        text = extract_paragraph_text_full(p)
        stripped = text.strip()

        if not stripped and not has_page_break and not has_image:
            continue

        if not stripped and has_page_break:
            structured_blocks.append({"type": "page_break"})
            if in_cover_zone and non_empty_idx > 0:
                in_cover_zone = False
            in_toc_zone = False
            continue

        non_empty_idx += 1
        words_in_p = len(stripped.split())
        word_count += words_in_p

        role = classify_paragraph_role(p, stripped, preset_id=preset_id, doc=doc)
        upper = stripped.upper()

        if role == "toc_item":
            in_toc_zone = True
        elif role == "h1":
            in_cover_zone = False
            seen_first_h1_in_cv = True
            heading_count += 1
            if upper == "DAFTAR ISI":
                in_toc_zone = True
                in_bibliography = False
            elif upper in {"DAFTAR PUSTAKA", "REFERENSI", "BIBLIOGRAFI"}:
                in_toc_zone = False
                in_bibliography = True
            else:
                in_toc_zone = False
                in_bibliography = False
        elif role in {"h2", "h3"}:
            in_cover_zone = False
            in_toc_zone = False
            heading_count += 1

        if in_cover_zone and words_in_p > 26:
            in_cover_zone = False

        run_fonts = set()
        run_sizes = set()
        all_bold = True
        any_bold = False
        for r in p.runs:
            if not r.text.strip():
                continue
            r_font = r.font.name or default_style_font or "Calibri"
            r_size = _pt_from_emu(r.font.size) or default_style_size or 11.0
            run_fonts.add(r_font)
            run_sizes.add(r_size)
            if r.bold:
                any_bold = True
            else:
                all_bold = False

        if not run_fonts:
            run_fonts.add(default_style_font or "Calibri")
        if not run_sizes:
            run_sizes.add(default_style_size or 11.0)

        actual_font = sorted(run_fonts)[0]
        actual_size = sorted(run_sizes)[0]
        actual_align = ALIGN_MAP_REVERSE.get(p.alignment, None)
        if actual_align is None and p.style and p.style.paragraph_format:
            actual_align = ALIGN_MAP_REVERSE.get(p.style.paragraph_format.alignment, "left")
        actual_align = actual_align or "left"

        pf = p.paragraph_format
        actual_spacing = pf.line_spacing
        if isinstance(actual_spacing, (int, float)) and actual_spacing < 5:
            actual_spacing_val = round(float(actual_spacing), 2)
        else:
            actual_spacing_val = None

        actual_indent_cm = _cm_from_emu(pf.first_line_indent)
        actual_left_indent_cm = _cm_from_emu(pf.left_indent) or 0.0

        is_toc_entry = role == "toc_item" or in_toc_zone or bool(TOC_LINE_RE.match(stripped))
        is_cover_block = in_cover_zone
        is_cv_or_journal_header = (
            (preset_id == "cv_ats" and not seen_first_h1_in_cv and non_empty_idx <= 4 and actual_align == "center")
            or (preset_id == "jurnal_artikel" and non_empty_idx <= 3 and actual_align == "center")
        )
        is_kop_or_signature = (
            (cover_style == "kop_surat" and non_empty_idx <= 3 and actual_align == "center")
            or actual_align == "right"
            or (actual_align == "center" and any(k in upper for k in ("MENGETAHUI", "NIP.", "NIDN.", "DOSEN PEMBIMBING", "PEMBIMBING INSTANSI", "HORMAT SAYA")))
            or upper.startswith(("NOMOR", "LAMPIRAN", "PERIHAL", "KEPADA", "YTH.", "HAL", "MENYETUJUI"))
        )

        snippet_short = stripped[:68] + ("..." if len(stripped) > 68 else "")

        if role == "h1":
            expected_p_size = float(preset["h1_size_pt"])
        elif role in {"h2", "h3"}:
            expected_p_size = float(preset["h2_size_pt"])
        elif is_cover_block or is_cv_or_journal_header or is_kop_or_signature:
            expected_p_size = actual_size if (target_size - 1.5 <= actual_size <= 18.0) else target_size
        elif is_toc_entry:
            expected_p_size = target_size
        else:
            expected_p_size = target_size

        font_mismatch = actual_font.lower() != target_font.lower()
        size_mismatch = abs(actual_size - expected_p_size) > 0.5

        if (font_mismatch or size_mismatch) and not has_image and len(findings) < 60:
            findings.append(
                {
                    "id": f"p-{non_empty_idx}-font",
                    "location": f"Paragraf {non_empty_idx}",
                    "rule": "font_family" if font_mismatch else "font_size",
                    "severity": "warning",
                    "message": (
                        f"Paragraf {non_empty_idx}: Font menggunakan {actual_font} {actual_size:g}pt, "
                        f"seharusnya {target_font} {expected_p_size:g}pt."
                    ),
                    "snippet": snippet_short,
                }
            )

        if role == "h1":
            exp_h1_align = preset.get("h1_align", "center")
            if actual_align != exp_h1_align or not (all_bold or any_bold):
                findings.append(
                    {
                        "id": f"p-{non_empty_idx}-h1",
                        "location": f"Paragraf {non_empty_idx} (Heading BAB)",
                        "rule": "headings",
                        "severity": "warning",
                        "message": (
                            f"Paragraf {non_empty_idx}: Heading BAB belum sesuai standar "
                            f"(harus tebal/bold, {preset['h1_size_pt']:g}pt, perataan {exp_h1_align})."
                        ),
                        "snippet": snippet_short,
                    }
                )
        elif role in {"h2", "h3"}:
            if not (all_bold or any_bold):
                findings.append(
                    {
                        "id": f"p-{non_empty_idx}-h2",
                        "location": f"Paragraf {non_empty_idx} (Subbab)",
                        "rule": "headings",
                        "severity": "warning",
                        "message": f"Paragraf {non_empty_idx}: Judul Subbab belum dicetak tebal (bold).",
                        "snippet": snippet_short,
                    }
                )
        elif in_bibliography and role == "body":
            if (actual_indent_cm is None or actual_indent_cm >= 0 or actual_left_indent_cm < 0.5) and len(findings) < 60:
                findings.append(
                    {
                        "id": f"p-{non_empty_idx}-bib",
                        "location": f"Paragraf {non_empty_idx} (Daftar Pustaka)",
                        "rule": "indentation",
                        "severity": "info",
                        "message": f"Paragraf {non_empty_idx}: Entri Daftar Pustaka belum menggunakan indentasi menggantung (hanging indent).",
                        "snippet": snippet_short,
                    }
                )
        elif is_cover_block:
            if actual_align != "center" or (actual_indent_cm and abs(actual_indent_cm) > 0.1):
                if len(findings) < 60:
                    findings.append(
                        {
                            "id": f"p-{non_empty_idx}-cover",
                            "location": f"Paragraf {non_empty_idx} (Cover)",
                            "rule": "alignment",
                            "severity": "warning",
                            "message": f"Paragraf {non_empty_idx}: Teks halaman cover belum rata tengah (center) atau masih berindentasi.",
                            "snippet": snippet_short,
                        }
                    )
        elif (
            role == "body"
            and not is_toc_entry
            and not is_kop_or_signature
            and not is_cv_or_journal_header
            and not has_image
            and len(stripped) > 45
        ):
            if actual_align != target_align and len(findings) < 60:
                findings.append(
                    {
                        "id": f"p-{non_empty_idx}-align",
                        "location": f"Paragraf {non_empty_idx}",
                        "rule": "alignment",
                        "severity": "info",
                        "message": (
                            f"Paragraf {non_empty_idx}: Perataan teks '{actual_align}', "
                            f"seharusnya '{target_align}'."
                        ),
                        "snippet": snippet_short,
                    }
                )
            if actual_spacing_val is None or abs(actual_spacing_val - target_spacing) > 0.12:
                if len(findings) < 60:
                    cur_sp_str = f"{actual_spacing_val:g}" if actual_spacing_val else "default (1.0/1.08)"
                    findings.append(
                        {
                            "id": f"p-{non_empty_idx}-spacing",
                            "location": f"Paragraf {non_empty_idx}",
                            "rule": "line_spacing",
                            "severity": "info",
                            "message": (
                                f"Paragraf {non_empty_idx}: Spasi baris {cur_sp_str}, "
                                f"seharusnya {target_spacing:g}."
                            ),
                            "snippet": snippet_short,
                        }
                    )
            if target_indent_cm > 0 and (actual_indent_cm is None or abs(actual_indent_cm - target_indent_cm) > 0.25):
                if len(findings) < 60:
                    cur_ind_str = f"{actual_indent_cm:g} cm" if actual_indent_cm else "0 cm (tanpa indentasi)"
                    findings.append(
                        {
                            "id": f"p-{non_empty_idx}-indent",
                            "location": f"Paragraf {non_empty_idx}",
                            "rule": "indentation",
                            "severity": "info",
                            "message": (
                                f"Paragraf {non_empty_idx}: Indentasi baris pertama {cur_ind_str}, "
                                f"seharusnya {target_indent_cm:g} cm."
                            ),
                            "snippet": snippet_short,
                        }
                    )

        block_type = (
            "image_logo"
            if has_image
            else "h1"
            if role == "h1"
            else "bib_item"
            if (in_bibliography and role == "body")
            else "toc_item"
            if is_toc_entry
            else role
        )

        structured_blocks.append(
            {
                "type": block_type,
                "p_idx": raw_idx,
                "text": stripped,
                "align": actual_align,
                "font": actual_font,
                "size_pt": actual_size,
                "bold": bool(all_bold or (any_bold and role in {"h1", "h2", "h3"})),
                "indent_cm": actual_indent_cm or 0.0,
                "left_indent_cm": actual_left_indent_cm,
                "line_spacing": actual_spacing_val or target_spacing,
                "has_image": has_image,
                "image_src": image_src,
            }
        )
        if has_page_break:
            structured_blocks.append({"type": "page_break"})
            if in_cover_zone and non_empty_idx > 0:
                in_cover_zone = False
            in_toc_zone = False

    pages = paginate_blocks_for_preview(structured_blocks, preset)

    return {
        "findings": findings,
        "total_findings": len(findings),
        "stats": {
            "paragraphs": non_empty_idx,
            "headings": heading_count,
            "tables": table_count,
            "words": word_count,
            "estimated_pages": len(pages),
        },
        "pages": pages,
    }


def is_major_chapter_or_section(btype: str, upper: str, preset_id: str) -> bool:
    """Determine if a block is a major academic chapter or front-matter section that strictly requires a fresh page."""
    if btype == "h1":
        # Any BAB header (BAB I, BAB II, BAB III, BAB IV, BAB 1, etc.)
        if re.match(r"^BAB\s+([IVXLCDM]+|\d+)\b", upper):
            return True
        # Standard academic front and back matter sections
        if upper in {
            "DAFTAR PUSTAKA",
            "BIBLIOGRAPHY",
            "REFERENCES",
            "LAMPIRAN",
            "KATA PENGANTAR",
            "PRAKATA",
            "DAFTAR ISI",
            "LEMBAR PENGESAHAN",
            "ABSTRAK",
            "ABSTRACT",
            "DAFTAR TABEL",
            "DAFTAR GAMBAR",
        }:
            return True
        if preset_id == "proposal" and upper in {
            "PENDAHULUAN",
            "LATAR BELAKANG",
            "DASAR PEMIKIRAN",
            "PENUTUP",
            "ANGGARAN BIAYA",
            "SUSUNAN KEPANITIAAN",
        }:
            return True
    return False


def paginate_blocks_for_preview(
    blocks: List[Dict[str, Any]], preset: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Split structured document blocks into realistic, densely filled A4 pages with Roman / Arabic page numbers."""
    pages: List[Dict[str, Any]] = []
    current_blocks: List[Dict[str, Any]] = []
    current_lines = 0.0

    margin_top = float(preset.get("margin_top_cm", 4.0))
    margin_bottom = float(preset.get("margin_bottom_cm", 3.0))
    usable_height_cm = 29.7 - margin_top - margin_bottom
    font_size_pt = float(preset.get("font_size_pt", 12.0))
    line_sp = float(preset.get("line_spacing", 1.5))
    chars_per_line = 66

    # Real capacity in physical lines of text
    # 22.7 cm * 28.35 pt/cm = 643.5 pt. With 18 pt line pitch -> 35.75 lines.
    max_lines_capacity = (usable_height_cm * 28.35) / (font_size_pt * line_sp)
    # Generous limit so normal pages are densely filled before spilling over
    page_line_limit = max(24.0, max_lines_capacity - 1.5)

    preset_id = preset.get("id", "makalah")
    in_main_content = not preset.get("use_roman_front_matter", True)
    roman_counter = 1
    arabic_counter = 1

    def to_roman(n: int) -> str:
        val = [10, 9, 5, 4, 1]
        syb = ["x", "ix", "v", "iv", "i"]
        res = ""
        for i in range(len(val)):
            while n >= val[i]:
                res += syb[i]
                n -= val[i]
        return res or "i"

    def flush_page(is_cover: bool = False):
        nonlocal current_blocks, current_lines, roman_counter, arabic_counter
        if not current_blocks:
            return
        page_idx = len(pages) + 1
        if is_cover:
            lbl = ""
            roman_counter += 1
        elif not in_main_content:
            lbl = to_roman(roman_counter)
            roman_counter += 1
        else:
            lbl = str(arabic_counter)
            arabic_counter += 1

        pages.append(
            {
                "page_number": page_idx,
                "footer_label": lbl,
                "is_cover": is_cover,
                "blocks": current_blocks,
            }
        )
        current_blocks = []
        current_lines = 0.0

    i = 0
    n_blocks = len(blocks)
    while i < n_blocks:
        b = blocks[i]
        btype = b.get("type")
        text = b.get("text", "").strip()
        upper = text.upper()

        if btype == "page_break":
            if current_blocks:
                is_first_cover = len(pages) == 0 and any(
                    x.get("has_image") or x.get("align") == "center" for x in current_blocks
                )
                flush_page(is_cover=is_first_cover)
            i += 1
            continue

        # Major Chapter / Section Break (BAB I, BAB II, BAB III, DAFTAR PUSTAKA, etc.)
        # MUST start on a brand new page!
        if is_major_chapter_or_section(btype, upper, preset_id):
            if current_blocks:
                is_first_cover = len(pages) == 0 and any(
                    x.get("has_image") or x.get("align") == "center" for x in current_blocks
                )
                flush_page(is_cover=is_first_cover)
            if re.match(r"^BAB\s+([IVXLCDM]+|\d+)\b", upper):
                in_main_content = True

        # Calculate line cost of this block
        if btype == "h1":
            block_lines = 2.5 + text.count("\n")
        elif btype in {"h2", "h3"}:
            block_lines = 1.8 + text.count("\n")
        elif b.get("has_image") or btype == "image_logo":
            block_lines = 8.0
        elif btype == "table":
            block_lines = len(b.get("rows", [])) * 1.3 + 1.0
        else:
            seg_lines = sum(max(1, math.ceil(len(s) / chars_per_line)) for s in text.split("\n"))
            block_lines = seg_lines + 0.35  # space after

        # Orphan heading protection: If block is a sub-heading (h2, h3) and remaining room < 3.8 lines,
        # move it to start cleanly with its content on the next page rather than sitting alone at the bottom.
        if btype in {"h2", "h3"} and (page_line_limit - current_lines < 3.8) and current_blocks:
            flush_page(is_cover=False)

        # Check if block fits on current page
        if current_lines + block_lines > page_line_limit and current_blocks:
            # Check if paragraph can be split cleanly across page boundary
            remaining_lines = page_line_limit - current_lines
            if btype in {"body", "list_bullet", "list_number"} and remaining_lines >= 4 and block_lines >= 6:
                # Split at sentence boundary
                sentences = re.split(r"(?<=[.!?])\s+", text)
                part1_sents = []
                part2_sents = []
                cur_acc_lines = 0.0
                for s in sentences:
                    s_lines = max(1, math.ceil(len(s) / chars_per_line))
                    if cur_acc_lines + s_lines <= remaining_lines or len(part1_sents) < 2:
                        part1_sents.append(s)
                        cur_acc_lines += s_lines
                    else:
                        part2_sents.append(s)

                if part1_sents and part2_sents:
                    b_part1 = dict(b)
                    b_part1["text"] = " ".join(part1_sents)
                    current_blocks.append(b_part1)
                    flush_page(is_cover=False)

                    b_part2 = dict(b)
                    b_part2["text"] = " ".join(part2_sents)
                    part2_lines = sum(max(1, math.ceil(len(s) / chars_per_line)) for s in part2_sents) + 0.35
                    current_blocks.append(b_part2)
                    current_lines = part2_lines
                    i += 1
                    continue

            flush_page(is_cover=False)

        current_blocks.append(b)
        current_lines += block_lines
        i += 1

    if current_blocks:
        is_first_cover = len(pages) == 0 and any(
            x.get("has_image") or x.get("align") == "center" for x in current_blocks
        )
        flush_page(is_cover=is_first_cover)

    if not pages:
        pages.append({"page_number": 1, "footer_label": "1", "is_cover": False, "blocks": []})

    return pages
