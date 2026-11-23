import io
import base64
import re
from html.parser import HTMLParser
from typing import Dict, Any, List, Tuple, Optional
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image, ImageDraw

from .analyzer import classify_paragraph_role, TOC_LINE_RE, TOC_SPACE_NUM_RE
from .markdown_parser import (
    ROMAN_CHAPTER_RE,
    SUBCHAPTER_RE,
    ACADEMIC_COVER_PRESETS,
    COVER_DOC_LABELS,
    CV_SECTION_HEADERS,
    PROPOSAL_SECTION_HEADERS,
    WORK_REPORT_SECTION_HEADERS,
    extract_cover_and_metadata_from_docx,
    extract_metadata_from_prose,
    _is_cv_contact_line,
    roman_from_arabic_bab,
    smart_title_case_id,
    smart_sentence_case_id,
    split_inline_kata_pengantar_signature,
)
from .ooxml_reader import (
    iter_document_blocks,
    extract_paragraph_text_full,
    extract_paragraph_runs_full,
    split_glued_cover_text,
)


ALIGN_MAP = {
    "left": WD_ALIGN_PARAGRAPH.LEFT,
    "center": WD_ALIGN_PARAGRAPH.CENTER,
    "right": WD_ALIGN_PARAGRAPH.RIGHT,
    "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
}

DATE_SIGNATURE_RE = re.compile(
    r"^[A-Za-z\s\.]{3,30},\s*(?:\d{1,2}\s+)?[A-Za-z]+\s+20\d{2}$"
)


def generate_default_university_logo_png() -> bytes:
    """Generate a clean, high-resolution emblem PNG if the user hasn't uploaded a custom logo."""
    img = Image.new("RGBA", (360, 360), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    draw.ellipse((35, 30, 325, 320), fill=(245, 189, 31, 255), outline=(217, 155, 16, 255), width=6)
    draw.ellipse((62, 57, 298, 293), fill=(255, 255, 255, 255))
    draw.ellipse((78, 73, 282, 277), fill=(29, 78, 216, 255))

    draw.polygon([(180, 95), (235, 145), (180, 195), (125, 145)], fill=(245, 189, 31, 255))
    draw.rectangle((130, 210, 230, 226), fill=(255, 255, 255, 255))
    draw.rectangle((148, 234, 212, 246), fill=(245, 189, 31, 255))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def decode_and_normalize_logo_png(logo_b64_or_uri: str | None) -> bytes:
    """
    Decode a base64/data-URI logo and auto-normalize it so ANY input size works without manual editing:
    - converts to RGBA PNG (JPG/WEBP/GIF/BMP supported)
    - trims empty transparent / near-white margins around the emblem
    - downsizes huge photos (> 1200 px) to keep the DOCX light
    - upscales tiny icons (< 600 px) with LANCZOS so they print sharp at 4 cm
    """
    if not logo_b64_or_uri or not str(logo_b64_or_uri).strip():
        return generate_default_university_logo_png()
    try:
        raw_str = str(logo_b64_or_uri).strip()
        if "," in raw_str:
            raw_str = raw_str.split(",", 1)[1]
        raw_bytes = base64.b64decode(raw_str)
        pil_img = Image.open(io.BytesIO(raw_bytes))
        try:
            pil_img.seek(0)
        except Exception:
            pass
        pil_img = pil_img.convert("RGBA")

        # Trim transparent margins + near-white background margins
        try:
            alpha_box = pil_img.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()
            rgb = pil_img.convert("RGB")
            nonwhite_mask = rgb.point(lambda v: 255 if v < 244 else 0).convert("L")
            nonwhite_box = nonwhite_mask.getbbox()
            boxes = [b for b in (alpha_box, nonwhite_box) if b]
            if boxes:
                # intersect: content must be both opaque and not white
                l = max(b[0] for b in boxes)
                t = max(b[1] for b in boxes)
                r = min(b[2] for b in boxes)
                bt = min(b[3] for b in boxes)
                if r - l > 8 and bt - t > 8:
                    pad = max(2, int(0.02 * max(r - l, bt - t)))
                    l = max(0, l - pad)
                    t = max(0, t - pad)
                    r = min(pil_img.width, r + pad)
                    bt = min(pil_img.height, bt + pad)
                    pil_img = pil_img.crop((l, t, r, bt))
        except Exception:
            pass

        longest = max(pil_img.width, pil_img.height)
        if longest > 1200:
            scale = 1200.0 / longest
            pil_img = pil_img.resize(
                (max(1, int(pil_img.width * scale)), max(1, int(pil_img.height * scale))),
                Image.LANCZOS,
            )
        elif longest < 600:
            scale = 600.0 / max(1, longest)
            pil_img = pil_img.resize(
                (max(1, int(pil_img.width * scale)), max(1, int(pil_img.height * scale))),
                Image.LANCZOS,
            )

        norm_buf = io.BytesIO()
        pil_img.save(norm_buf, format="PNG", optimize=True)
        return norm_buf.getvalue()
    except Exception:
        return generate_default_university_logo_png()


_ACADEMIC_DEGREE_MAP = {
    "dr": "Dr",
    "dr.": "Dr.",
    "prof": "Prof",
    "prof.": "Prof.",
    "ir": "Ir",
    "ir.": "Ir.",
    "dra": "Dra",
    "dra.": "Dra.",
    "drs": "Drs",
    "drs.": "Drs.",
    "hj": "Hj",
    "hj.": "Hj.",
    "h": "H",
    "h.": "H.",
    "s.kom": "S.Kom",
    "s.kom.": "S.Kom.",
    "m.kom": "M.Kom",
    "m.kom.": "M.Kom.",
    "s.t": "S.T",
    "s.t.": "S.T.",
    "m.t": "M.T",
    "m.t.": "M.T.",
    "m.eng": "M.Eng",
    "m.eng.": "M.Eng.",
    "m.sc": "M.Sc",
    "m.sc.": "M.Sc.",
    "m.pd": "M.Pd",
    "m.pd.": "M.Pd.",
    "s.pd": "S.Pd",
    "s.pd.": "S.Pd.",
    "m.si": "M.Si",
    "m.si.": "M.Si.",
    "s.si": "S.Si",
    "s.si.": "S.Si.",
    "s.e": "S.E",
    "s.e.": "S.E.",
    "m.m": "M.M",
    "m.m.": "M.M.",
    "m.b.a": "M.B.A",
    "m.b.a.": "M.B.A.",
    "s.h": "S.H",
    "s.h.": "S.H.",
    "m.h": "M.H",
    "m.h.": "M.H.",
    "ph.d": "Ph.D",
    "ph.d.": "Ph.D.",
}


def normalize_academic_name(raw_name: str) -> str:
    """Format academic names and Indonesian titles/degrees properly (e.g. 'dr. budi santoso, m.kom' -> 'Dr. Budi Santoso, M.Kom')."""
    s = (raw_name or "").strip()
    if not s:
        return ""
    tokens = s.split()
    out_tokens = []
    for tok in tokens:
        trailing_comma = "," if tok.endswith(",") else ""
        core = tok.rstrip(",")
        low = core.lower()
        if low in _ACADEMIC_DEGREE_MAP:
            out_tokens.append(_ACADEMIC_DEGREE_MAP[low] + trailing_comma)
        elif "." in core and len(core) <= 8:
            parts = [p[:1].upper() + p[1:].lower() if p else "" for p in core.split(".")]
            out_tokens.append(".".join(parts) + trailing_comma)
        else:
            out_tokens.append((core[:1].upper() + core[1:].lower()) + trailing_comma)
    return " ".join(out_tokens)


def split_institution_block(raw_block: str) -> Dict[str, str]:
    """
    Split glued or single-line academic institution metadata such as:
    'program studi teknik informatika fakultas teknologi informasi dan komunikasi universitas semarang 2026'
    into separate study_program, department, faculty, institution, and year fields.
    """
    s = re.sub(r"\s+", " ", (raw_block or "")).strip()
    if not s:
        return {}

    result: Dict[str, str] = {}
    m_yr = re.search(r"\b(20\d{2})\s*$", s)
    if m_yr:
        result["year"] = m_yr.group(1)
        s = s[: m_yr.start()].strip()

    pattern = re.compile(
        r"\b(PROGRAM\s+STUDI|PRODI|JURUSAN|DEPARTEMEN|FAKULTAS|UNIVERSITAS|INSTITUT|POLITEKNIK|SEKOLAH\s+TINGGI|SMA\s+NEGERI|SMK\s+NEGERI|SMA|SMK|MADRASAH)\b",
        re.IGNORECASE,
    )
    matches = list(pattern.finditer(s))
    if not matches:
        return result

    for idx, m in enumerate(matches):
        start = m.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(s)
        segment = s[start:end].strip(" ,;-\n\t")
        kw = m.group(1).upper()
        if kw.startswith("PROGRAM") or kw == "PRODI":
            result["study_program"] = segment.upper()
        elif kw in {"JURUSAN", "DEPARTEMEN"}:
            result["department"] = segment.upper()
        elif kw == "FAKULTAS":
            result["faculty"] = segment.upper()
        else:
            result["institution"] = segment.upper()
    return result


def add_logo_fit_box(run, logo_b64_or_uri: str | None, box_w_cm: float, box_h_cm: float):
    """
    Insert the normalized logo into a run so it fits INSIDE a standard box (keeps aspect ratio):
    tall logos are limited by height, wide logos by width. No manual resizing needed.
    """
    png_bytes = decode_and_normalize_logo_png(logo_b64_or_uri)
    with Image.open(io.BytesIO(png_bytes)) as im:
        w_px, h_px = im.size
    aspect = (w_px / float(h_px)) if h_px else 1.0
    if aspect >= (box_w_cm / box_h_cm):
        run.add_picture(io.BytesIO(png_bytes), width=Cm(box_w_cm))
    else:
        run.add_picture(io.BytesIO(png_bytes), height=Cm(box_h_cm))


def hex_to_rgb(hex_or_rgb_str: str | None) -> Tuple[int, int, int]:
    """Convert hex (#1e3a8a), rgb(r, g, b), or named colors into RGB tuple."""
    if not hex_or_rgb_str:
        return (0, 0, 0)
    s = str(hex_or_rgb_str).strip().lower()
    if s.startswith("rgb"):
        nums = re.findall(r"\d+", s)
        if len(nums) >= 3:
            return (min(255, int(nums[0])), min(255, int(nums[1])), min(255, int(nums[2])))
    if s.startswith("#"):
        s = s.lstrip("#")
        if len(s) == 3:
            s = "".join(c * 2 for c in s)
        if len(s) == 6:
            try:
                return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))
            except ValueError:
                pass
    named_colors = {
        "black": (0, 0, 0),
        "blue": (30, 58, 138),
        "navy": (30, 58, 138),
        "red": (220, 38, 38),
        "green": (22, 163, 74),
        "gray": (75, 85, 99),
        "grey": (75, 85, 99),
        "gold": (217, 119, 6),
        "purple": (126, 34, 206),
    }
    return named_colors.get(s, (0, 0, 0))


class SimpleDocxHTMLParser(HTMLParser):
    """Parses rich HTML formatted by Word web toolbar into OOXML run tokens with styles."""
    def __init__(self, default_font="Times New Roman", default_size_pt=12.0):
        super().__init__()
        self.runs = []
        self.bold_stack = [False]
        self.italic_stack = [False]
        self.underline_stack = [False]
        self.strike_stack = [False]
        self.color_stack = [(0, 0, 0)]
        self.font_stack = [default_font]
        self.size_stack = [default_size_pt]

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        tag = tag.lower()
        if tag in ("b", "strong"):
            self.bold_stack.append(True)
        elif tag in ("i", "em"):
            self.italic_stack.append(True)
        elif tag in ("u", "ins"):
            self.underline_stack.append(True)
        elif tag in ("s", "strike", "del"):
            self.strike_stack.append(True)
        elif tag in ("span", "font"):
            style = attr_dict.get("style", "")
            color_match = re.search(r"color\s*:\s*([^;]+)", style, re.I)
            font_color = attr_dict.get("color")
            if color_match:
                self.color_stack.append(hex_to_rgb(color_match.group(1)))
            elif font_color:
                self.color_stack.append(hex_to_rgb(font_color))
            else:
                self.color_stack.append(self.color_stack[-1])
            # font size
            size_match = re.search(r"font-size\s*:\s*([\d\.]+)(pt|px)?", style, re.I)
            if size_match:
                sz = float(size_match.group(1))
                if size_match.group(2) == "px":
                    sz = round(sz * 0.75, 1)
                self.size_stack.append(sz)
            else:
                self.size_stack.append(self.size_stack[-1])
            # font family
            fam_match = re.search(r"font-family\s*:\s*([^;]+)", style, re.I)
            font_face = attr_dict.get("face")
            if fam_match:
                self.font_stack.append(fam_match.group(1).replace('"', '').replace("'", '').strip())
            elif font_face:
                self.font_stack.append(font_face.strip())
            else:
                self.font_stack.append(self.font_stack[-1])

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("b", "strong") and len(self.bold_stack) > 1:
            self.bold_stack.pop()
        elif tag in ("i", "em") and len(self.italic_stack) > 1:
            self.italic_stack.pop()
        elif tag in ("u", "ins") and len(self.underline_stack) > 1:
            self.underline_stack.pop()
        elif tag in ("s", "strike", "del") and len(self.strike_stack) > 1:
            self.strike_stack.pop()
        elif tag in ("span", "font"):
            if len(self.color_stack) > 1:
                self.color_stack.pop()
            if len(self.font_stack) > 1:
                self.font_stack.pop()
            if len(self.size_stack) > 1:
                self.size_stack.pop()

    def handle_data(self, data):
        if data:
            self.runs.append({
                "text": data,
                "bold": self.bold_stack[-1],
                "italic": self.italic_stack[-1],
                "underline": self.underline_stack[-1],
                "strike": self.strike_stack[-1],
                "color_rgb": self.color_stack[-1],
                "font_name": self.font_stack[-1],
                "size_pt": self.size_stack[-1],
            })


def markdown_to_html_snippet(text: str) -> str:
    """Quickly convert common markdown tokens (**bold**, *italic*, ~~strike~~) to HTML tags for parser."""
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(r"~~(.+?)~~", r"<s>\1</s>", text)
    return text


def set_run_font_ooxml(
    run,
    font_name: str,
    size_pt: float | None = None,
    bold: bool | None = None,
    italic: bool | None = None,
    underline: bool | None = None,
    strike: bool | None = None,
    color_rgb: Tuple[int, int, int] = (0, 0, 0),
):
    """Force font family on all OOXML font slots (ascii, hAnsi, cs, eastAsia) and clear highlights."""
    run.font.name = font_name
    if size_pt is not None:
        run.font.size = Pt(size_pt)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if underline is not None:
        run.font.underline = underline
    if strike is not None:
        run.font.strike = strike
    run.font.color.rgb = RGBColor(*color_rgb)

    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), font_name)
    rFonts.set(qn("w:hAnsi"), font_name)
    rFonts.set(qn("w:cs"), font_name)
    rFonts.set(qn("w:eastAsia"), font_name)


def set_outline_level_ooxml(paragraph, level: int):
    """Set w:outlineLvl (0 for Heading 1, 1 for Heading 2, 2 for Heading 3) so Word TOC recognizes it."""
    pPr = paragraph._p.get_or_add_pPr()
    outline = pPr.find(qn("w:outlineLvl"))
    if outline is None:
        outline = OxmlElement("w:outlineLvl")
        pPr.append(outline)
    outline.set(qn("w:val"), str(level))


def add_page_number_field_to_footer(section, font_name: str, font_size_pt: float = 11.0):
    """Insert a genuine OOXML PAGE field centered in the section footer."""
    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    run_begin = p.add_run()
    set_run_font_ooxml(run_begin, font_name, font_size_pt)
    fldChar1 = OxmlElement("w:fldChar")
    fldChar1.set(qn("w:fldCharType"), "begin")
    run_begin._r.append(fldChar1)

    run_instr = p.add_run()
    set_run_font_ooxml(run_instr, font_name, font_size_pt)
    instrText = OxmlElement("w:instrText")
    instrText.set(qn("xml:space"), "preserve")
    instrText.text = " PAGE "
    run_instr._r.append(instrText)

    run_sep = p.add_run()
    set_run_font_ooxml(run_sep, font_name, font_size_pt)
    fldChar2 = OxmlElement("w:fldChar")
    fldChar2.set(qn("w:fldCharType"), "separate")
    run_sep._r.append(fldChar2)

    run_val = p.add_run("1")
    set_run_font_ooxml(run_val, font_name, font_size_pt)

    run_end = p.add_run()
    set_run_font_ooxml(run_end, font_name, font_size_pt)
    fldChar3 = OxmlElement("w:fldChar")
    fldChar3.set(qn("w:fldCharType"), "end")
    run_end._r.append(fldChar3)


def set_section_page_number_format(section, fmt: str = "decimal", start: int | None = 1):
    """Configure OOXML <w:pgNumType w:fmt="lowerRoman" w:start="1"/> on a section's sectPr."""
    sectPr = section._sectPr
    pgNumType = sectPr.find(qn("w:pgNumType"))
    if pgNumType is None:
        pgNumType = OxmlElement("w:pgNumType")
        sectPr.append(pgNumType)
    pgNumType.set(qn("w:fmt"), fmt)
    if start is not None:
        pgNumType.set(qn("w:start"), str(start))


def add_bottom_border_to_paragraph(paragraph, size_eighth_pt: int = 18):
    """Add a bottom border line (used for Kop Surat or CV ATS section headers)."""
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = pPr.find(qn("w:pBdr"))
    if pBdr is None:
        pBdr = OxmlElement("w:pBdr")
        pPr.append(pBdr)
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "thickThinLargeGap" if size_eighth_pt >= 18 else "single")
    bottom.set(qn("w:sz"), str(size_eighth_pt))
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), "000000")
    pBdr.append(bottom)


def insert_toc_field_paragraph(
    doc: Document,
    toc_entries: List[Tuple[str, str, str]],
    font_name: str,
    font_size_pt: float,
    h1_size_pt: float = 14.0,
):
    """
    Build a genuine Word OOXML TOC Field (`TOC \\o "1-3" \\h \\z \\u`) pre-populated with
    detected headings so it looks great immediately AND updates natively in Microsoft Word.
    """
    h_p = doc.add_paragraph(style="Heading 1")
    h_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    h_p.paragraph_format.first_line_indent = Cm(0)
    h_p.paragraph_format.space_before = Pt(0)
    h_p.paragraph_format.space_after = Pt(12)
    r_h = h_p.add_run("DAFTAR ISI")
    set_run_font_ooxml(r_h, font_name, h1_size_pt, bold=True)
    set_outline_level_ooxml(h_p, 0)

    settings_el = doc.settings.element
    if settings_el.find(qn("w:updateFields")) is None:
        upd = OxmlElement("w:updateFields")
        upd.set(qn("w:val"), "true")
        settings_el.append(upd)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.line_spacing = 1.35
    p.paragraph_format.space_after = Pt(3)

    r_begin = p.add_run()
    fld1 = OxmlElement("w:fldChar")
    fld1.set(qn("w:fldCharType"), "begin")
    fld1.set(qn("w:dirty"), "true")
    r_begin._r.append(fld1)

    r_instr = p.add_run()
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = ' TOC \\o "1-3" \\h \\z \\u '
    r_instr._r.append(instr)

    r_sep = p.add_run()
    fld2 = OxmlElement("w:fldChar")
    fld2.set(qn("w:fldCharType"), "separate")
    r_sep._r.append(fld2)

    for idx, (level, title, pg_str) in enumerate(toc_entries):
        clean_title = " ".join(title.splitlines()).strip()
        indent_prefix = "" if level == "h1" else ("    " if level == "h2" else "        ")
        dots_count = max(8, 64 - len(indent_prefix) - len(clean_title) - len(pg_str))
        dots = "." * dots_count
        line_text = f"{indent_prefix}{clean_title} {dots} {pg_str}"
        if idx > 0:
            p_line = doc.add_paragraph()
            p_line.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p_line.paragraph_format.first_line_indent = Cm(0)
            p_line.paragraph_format.line_spacing = 1.35
            p_line.paragraph_format.space_after = Pt(2)
            r_item = p_line.add_run(line_text)
            set_run_font_ooxml(r_item, font_name, font_size_pt, bold=(level == "h1"))
        else:
            r_item = p.add_run(line_text)
            set_run_font_ooxml(r_item, font_name, font_size_pt, bold=(level == "h1"))

    p_end = doc.add_paragraph()
    p_end.paragraph_format.first_line_indent = Cm(0)
    r_end = p_end.add_run()
    fld3 = OxmlElement("w:fldChar")
    fld3.set(qn("w:fldCharType"), "end")
    r_end._r.append(fld3)


def _clean_whitespace(txt: str) -> str:
    """Normalize multiple spaces while preserving deliberate newlines and tabs."""
    lines = []
    for line in txt.splitlines():
        cleaned = re.sub(r" {2,}", " ", line).strip()
        if cleaned:
            lines.append(cleaned)
    return "\n".join(lines)


def _extract_body_image_bytes(p) -> bytes | None:
    """Extract embedded image bytes from a body paragraph if present."""
    try:
        rids = p._p.xpath('.//*[local-name()="blip"]/@*[local-name()="embed"]')
        if not rids:
            rids = p._p.xpath('.//*[local-name()="imagedata"]/@*[local-name()="id"]')
        for rid in rids:
            part = p.part.related_parts.get(rid)
            if part is None and rid in p.part.rels:
                part = p.part.rels[rid].target_part
            if part is not None and getattr(part, "blob", None):
                img = Image.open(io.BytesIO(part.blob)).convert("RGBA")
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                return buf.getvalue()
    except Exception:
        return None
    return None


def apply_inline_edits_to_docx(
    doc_bytes: bytes,
    paragraph_updates: List[Dict[str, Any]],
    table_updates: List[Dict[str, Any]],
    logo_update: Optional[Dict[str, Any]] = None,
    cover_data: Optional[Dict[str, Any]] = None,
    deleted_p_indices: Optional[List[int]] = None,
    new_pages: Optional[List[Dict[str, Any]]] = None,
    reordered_p_indices: Optional[List[int]] = None,
) -> bytes:
    """
    Apply inline edits from the Web Editor directly onto the real OOXML document
    while preserving 100% of paragraph styles, margins, fonts, section breaks, and TOC fields.
    Supports rich text runs, deletions, image insertions, reordering, and new page additions.
    """
    doc = Document(io.BytesIO(doc_bytes))
    p_map = {}
    t_map = {}
    for kind, obj, raw_idx in iter_document_blocks(doc):
        if kind == "paragraph":
            p_map[raw_idx] = obj
        else:
            t_map[raw_idx] = obj

    # 1. Process explicit paragraph deletions (e.g. removing empty gap blocks)
    for del_idx in (deleted_p_indices or []):
        p_del = p_map.get(int(del_idx))
        if p_del is not None:
            p_elem = p_del._p
            parent = p_elem.getparent()
            if parent is not None:
                parent.remove(p_elem)

    # 2. Process paragraph updates
    for upd in paragraph_updates:
        p_idx = upd.get("p_idx")
        if p_idx is None:
            continue
        p = p_map.get(int(p_idx))
        if p is None:
            continue

        # If requested to delete this paragraph
        if upd.get("delete"):
            p_elem = p._p
            parent = p_elem.getparent()
            if parent is not None:
                parent.remove(p_elem)
            continue

        # If this paragraph was replaced with an image
        if upd.get("image_base64"):
            for child in list(p._p):
                if child.tag != qn("w:pPr"):
                    p._p.remove(child)
            raw_b64 = str(upd["image_base64"])
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            try:
                img_bytes = base64.b64decode(raw_b64)
                w_cm = float(upd.get("image_width_cm") or 6.0)
                run = p.add_run()
                run.add_picture(io.BytesIO(img_bytes), width=Cm(w_cm))
                al_val = upd.get("align")
                if al_val:
                    al_s = str(al_val).lower().strip()
                    if al_s == "center":
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    elif al_s == "right":
                        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                    elif al_s == "left":
                        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            except Exception:
                pass
            continue

        new_text = upd.get("text")
        if new_text is None:
            continue

        # Capture base styling from first visible text run
        font_name = upd.get("font_name") or "Times New Roman"
        font_size_pt = upd.get("size_pt")
        is_bold = upd.get("bold")
        is_italic = upd.get("italic")
        is_underline = upd.get("underline")
        is_strike = upd.get("strike")
        align_val = upd.get("align")
        color_val = upd.get("color")
        color_rgb = hex_to_rgb(color_val) if color_val else (0, 0, 0)

        for r in p.runs:
            if r.text.strip():
                if not upd.get("font_name") and r.font.name:
                    font_name = r.font.name
                if font_size_pt is None and r.font.size:
                    font_size_pt = round(float(r.font.size) / 12700.0, 1)
                if is_bold is None:
                    is_bold = r.bold
                if is_italic is None:
                    is_italic = r.italic
                if is_underline is None:
                    is_underline = r.font.underline
                if is_strike is None:
                    is_strike = r.font.strike
                break

        # Apply paragraph alignment if requested
        if align_val:
            al = str(align_val).lower().strip()
            if al == "center":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif al == "right":
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            elif al == "justify":
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            elif al == "left":
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT

        # Detect if paragraph is part of a Word TOC field
        has_fld = any(el.tag == qn("w:fldChar") for el in p._p.iter())
        if has_fld:
            # Replace only display text runs inside TOC field (between 'separate' and 'end')
            in_result = False
            replaced = False
            for child in list(p._p):
                if child.tag == qn("w:r"):
                    fld_chars = child.findall(qn("w:fldChar"))
                    if fld_chars:
                        ftype = fld_chars[0].get(qn("w:fldCharType"))
                        if ftype == "separate":
                            in_result = True
                        elif ftype == "end":
                            in_result = False
                        continue
                    if in_result:
                        if not replaced:
                            t_els = child.findall(qn("w:t"))
                            if t_els:
                                t_els[0].text = str(new_text)
                                replaced = True
                            else:
                                p._p.remove(child)
                        else:
                            p._p.remove(child)
            if not replaced:
                run = p.add_run(str(new_text))
                set_run_font_ooxml(
                    run,
                    font_name,
                    font_size_pt,
                    bold=is_bold,
                    italic=is_italic,
                    underline=is_underline,
                    strike=is_strike,
                    color_rgb=color_rgb,
                )
            continue

        # Normal paragraph: remove old text/hyperlink/sdt runs while preserving pPr, drawings, and page breaks
        for child in list(p._p):
            if child.tag == qn("w:pPr"):
                continue
            if child.tag == qn("w:r"):
                has_protected = any(
                    sub.tag in {qn("w:drawing"), qn("w:pict")}
                    or (sub.tag == qn("w:br") and sub.get(qn("w:type")) == "page")
                    for sub in child
                )
                if not has_protected:
                    p._p.remove(child)
            elif child.tag in {qn("w:hyperlink"), qn("w:sdt"), qn("w:smartTag"), qn("w:ins")}:
                p._p.remove(child)

        # Check if text contains rich HTML or markdown tokens
        raw_input = str(upd.get("html") or new_text)
        has_rich = ("<" in raw_input and ">" in raw_input) or ("**" in raw_input) or ("* " not in raw_input and "*" in raw_input) or ("~~" in raw_input)
        if has_rich:
            html_snippet = markdown_to_html_snippet(raw_input)
            parser = SimpleDocxHTMLParser(
                default_font=font_name,
                default_size_pt=font_size_pt or 12.0
            )
            parser.feed(html_snippet)
            if parser.runs:
                for r_info in parser.runs:
                    run = p.add_run(r_info["text"])
                    eff_b = r_info["bold"] if r_info["bold"] else is_bold
                    eff_i = r_info["italic"] if r_info["italic"] else is_italic
                    eff_u = r_info["underline"] if r_info["underline"] else is_underline
                    eff_s = r_info["strike"] if r_info["strike"] else is_strike
                    eff_f = r_info.get("font_name") or font_name
                    eff_sz = r_info.get("size_pt") or font_size_pt
                    eff_col = r_info.get("color_rgb") or color_rgb
                    set_run_font_ooxml(
                        run,
                        eff_f,
                        eff_sz,
                        bold=eff_b,
                        italic=eff_i,
                        underline=eff_u,
                        strike=eff_s,
                        color_rgb=eff_col,
                    )
            else:
                run = p.add_run(str(new_text))
                set_run_font_ooxml(
                    run,
                    font_name,
                    font_size_pt,
                    bold=is_bold,
                    italic=is_italic,
                    underline=is_underline,
                    strike=is_strike,
                    color_rgb=color_rgb,
                )
        else:
            run = p.add_run(str(new_text))
            set_run_font_ooxml(
                run,
                font_name,
                font_size_pt,
                bold=is_bold,
                italic=is_italic,
                underline=is_underline,
                strike=is_strike,
                color_rgb=color_rgb,
            )

    # Apply any logo updates (alignment, top spacing)
    effective_logo_meta = {**(cover_data or {}), **(logo_update or {})}
    if effective_logo_meta:
        target_align = effective_logo_meta.get("logo_align")
        target_margin = effective_logo_meta.get("logo_margin_top_pt")
        # Find first paragraph with drawing (cover logo)
        for p_elem in doc.paragraphs[:15]:
            has_drawing = any(
                sub.tag in {qn("w:drawing"), qn("w:pict")}
                for r in p_elem.runs
                for sub in r._r
            )
            if has_drawing:
                if target_align:
                    al = str(target_align).lower().strip()
                    if al == "left":
                        p_elem.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    elif al == "right":
                        p_elem.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                    else:
                        p_elem.alignment = WD_ALIGN_PARAGRAPH.CENTER
                if target_margin is not None:
                    try:
                        p_elem.paragraph_format.space_before = Pt(float(target_margin))
                    except Exception:
                        pass
                break

    for tbl_upd in table_updates:
        t_idx = tbl_upd.get("table_idx")
        rows = tbl_upd.get("rows")
        if t_idx is None or not rows:
            continue
        tbl = t_map.get(int(t_idx))
        if tbl is None:
            continue
        for r_i, row_vals in enumerate(rows):
            if r_i >= len(tbl.rows):
                break
            row_cells = tbl.rows[r_i].cells
            for c_i, cell_val in enumerate(row_vals):
                if c_i >= len(row_cells):
                    break
                cell_p = row_cells[c_i].paragraphs[0]
                c_font = "Times New Roman"
                c_size = None
                c_bold = (r_i == 0)
                for r in cell_p.runs:
                    if r.text.strip():
                        if r.font.name:
                            c_font = r.font.name
                        if r.font.size:
                            c_size = round(float(r.font.size) / 12700.0, 1)
                        c_bold = r.bold
                        break
                cell_p.text = ""
                run = cell_p.add_run(str(cell_val))
                set_run_font_ooxml(run, c_font, c_size, bold=c_bold)

    # 3. Apply paragraph reordering if requested
    if reordered_p_indices and len(reordered_p_indices) > 1:
        for i in range(len(reordered_p_indices) - 1):
            idx_1 = reordered_p_indices[i]
            idx_2 = reordered_p_indices[i + 1]
            p1 = p_map.get(int(idx_1))
            p2 = p_map.get(int(idx_2))
            if p1 is not None and p2 is not None:
                el1 = p1._p
                el2 = p2._p
                par = el1.getparent()
                if par is not None and par == el2.getparent():
                    pos1 = par.index(el1)
                    pos2 = par.index(el2)
                    if pos1 > pos2:
                        par.remove(el1)
                        par.insert(pos2, el1)

    # 4. Append new pages / slides if requested
    if new_pages:
        for new_pg in new_pages:
            doc.add_page_break()
            for blk in new_pg.get("blocks", []):
                b_type = blk.get("type", "paragraph")
                if blk.get("image_base64"):
                    raw_b64 = str(blk["image_base64"])
                    if "," in raw_b64:
                        raw_b64 = raw_b64.split(",", 1)[1]
                    try:
                        img_bytes = base64.b64decode(raw_b64)
                        w_cm = float(blk.get("image_width_cm") or 6.0)
                        p_new = doc.add_paragraph()
                        p_new.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        r = p_new.add_run()
                        r.add_picture(io.BytesIO(img_bytes), width=Cm(w_cm))
                    except Exception:
                        pass
                else:
                    txt = blk.get("text") or ""
                    if b_type in ("h1", "h2", "h3"):
                        lvl = 1 if b_type == "h1" else (2 if b_type == "h2" else 3)
                        p_new = doc.add_heading(txt, level=lvl)
                    else:
                        p_new = doc.add_paragraph(txt)
                    if blk.get("align"):
                        al_s = str(blk.get("align")).lower()
                        if al_s == "center":
                            p_new.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        elif al_s == "right":
                            p_new.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                        elif al_s == "justify":
                            p_new.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    out_buf = io.BytesIO()
    doc.save(out_buf)
    return out_buf.getvalue()


def format_docx_document(
    source_doc: Document,
    preset: Dict[str, Any],
    rules: Dict[str, bool],
    cover_data: Dict[str, Any] | None = None,
) -> Document:
    """
    Apply the 12 toggleable formatting rules tailored cleanly to each of the 9 preset templates.
    Uses iter_document_blocks so interleaved tables, hyperlinks, SDTs, textboxes, and images
    are 100% preserved in their exact positions.
    """
    cover_data = cover_data or {}
    preset_id = preset.get("id", "makalah")
    font_name = preset["font_name"]
    font_size_pt = float(preset["font_size_pt"])
    table_font_size_pt = float(preset.get("table_font_size_pt", font_size_pt - 1))
    line_spacing = float(preset["line_spacing"])
    first_indent_cm = float(preset["first_line_indent_cm"])
    body_align = ALIGN_MAP.get(preset["alignment"], WD_ALIGN_PARAGRAPH.JUSTIFY)
    space_before_pt = float(preset.get("space_before_pt", 0.0))
    space_after_pt = float(preset.get("space_after_pt", 6.0))
    h1_size_pt = float(preset.get("h1_size_pt", 14.0))
    h2_size_pt = float(preset.get("h2_size_pt", 12.0))
    h3_size_pt = float(preset.get("h3_size_pt", 12.0))
    h1_align = ALIGN_MAP.get(preset.get("h1_align", "center"), WD_ALIGN_PARAGRAPH.CENTER)
    cover_style = preset.get("cover_style", "academic_makalah")
    is_academic_cover_preset = preset_id in ACADEMIC_COVER_PRESETS

    # 1. Extract cover & prose metadata
    extracted_doc_meta, cover_end_raw_idx = extract_cover_and_metadata_from_docx(
        source_doc, preset_id=preset_id
    )
    if not is_academic_cover_preset:
        cover_end_raw_idx = 0

    prose_lines = []
    in_skip_meta_block = False
    for kind, obj, raw_i in iter_document_blocks(source_doc):
        if kind != "paragraph":
            continue
        t = extract_paragraph_text_full(obj).strip()
        if not t:
            continue
        u = t.upper()
        if raw_i >= cover_end_raw_idx and any(
            k in u for k in ("LEMBAR PENGESAHAN", "HALAMAN PENGESAHAN", "DAFTAR ISI")
        ):
            in_skip_meta_block = True
            continue
        if any(k in u for k in ("KATA PENGANTAR", "PRAKATA", "BAB I", "BAB 1")):
            in_skip_meta_block = False
        if not in_skip_meta_block:
            prose_lines.append(t)
        if len(prose_lines) >= 40:
            break
    prose_meta = extract_metadata_from_prose("\n".join(prose_lines))

    merged_meta: Dict[str, Any] = dict(extracted_doc_meta)
    for k, v in prose_meta.items():
        if v and not merged_meta.get(k):
            merged_meta[k] = v
    for k, v in cover_data.items():
        if v is not None and str(v).strip() != "":
            merged_meta[k] = v

    effective_logo_b64 = (
        cover_data.get("logo_base64")
        or extracted_doc_meta.get("extracted_logo_base64")
        or ""
    )

    # 2. Extract and normalize paragraphs + interleaved tables in exact reading order
    source_blocks = list(iter_document_blocks(source_doc))
    raw_items: List[Dict[str, Any]] = []
    has_existing_kata_pengantar = False
    has_existing_lembar_pengesahan = False

    skipping_old_manual_toc = False
    in_bibliography_section = False
    in_kata_pengantar_section = False
    in_lembar_pengesahan_section = False
    cv_seen_first_section = False
    cv_header_count = 0
    last_seen_p_idx = -1

    b_pos = 0
    n_blocks = len(source_blocks)
    while b_pos < n_blocks:
        kind, obj, raw_idx = source_blocks[b_pos]

        if kind == "table":
            if rules.get("auto_cover", True) and is_academic_cover_preset and last_seen_p_idx < cover_end_raw_idx and cover_end_raw_idx > 0:
                b_pos += 1
                continue
            t_rows = []
            for row in obj.rows:
                t_rows.append([_clean_whitespace(cell.text) for cell in row.cells])
            if t_rows:
                raw_items.append({"kind": "table", "rows": t_rows})
            b_pos += 1
            continue

        p = obj
        last_seen_p_idx = raw_idx

        if rules.get("auto_cover", True) and is_academic_cover_preset and raw_idx < cover_end_raw_idx:
            b_pos += 1
            continue

        full_text = extract_paragraph_text_full(p)
        raw_stripped = full_text.strip()
        txt = _clean_whitespace(full_text)
        has_pb = "w:br" in p._p.xml and 'w:type="page"' in p._p.xml
        has_img = "w:drawing" in p._p.xml or "w:pict" in p._p.xml
        body_img_bytes = _extract_body_image_bytes(p) if has_img else None

        if not txt and not has_pb and not body_img_bytes:
            b_pos += 1
            continue

        if body_img_bytes and not txt:
            raw_items.append({"kind": "image", "image_bytes": body_img_bytes})
            if has_pb:
                raw_items.append({"kind": "page_break"})
            b_pos += 1
            continue

        if not txt and has_pb:
            if raw_items and raw_items[-1].get("kind") != "page_break":
                raw_items.append({"kind": "page_break"})
            skipping_old_manual_toc = False
            b_pos += 1
            continue

        if not rules.get("auto_cover", True) and raw_idx < cover_end_raw_idx:
            for part in split_glued_cover_text(txt) or [txt]:
                raw_items.append(
                    {
                        "kind": "paragraph",
                        "role": "cover_line",
                        "text": part,
                        "runs": [{"text": part, "bold": True, "italic": False}],
                    }
                )
            b_pos += 1
            continue

        # Check TOC lines against raw_stripped BEFORE _clean_whitespace collapses '  4' -> ' 4'
        is_explicit_toc_line = bool(
            TOC_LINE_RE.match(raw_stripped)
            or TOC_SPACE_NUM_RE.match(raw_stripped)
            or re.search(r"(?:\.{2,}|\s{2,}|\t)\s*(?:[ivxlcdm]+|\d+)\s*$", raw_stripped, re.IGNORECASE)
        )

        if skipping_old_manual_toc:
            if (
                is_explicit_toc_line
                or re.match(
                    r"^(?:BAB\s+[IVXLCDM0-9]+\b|\d+\.\d+(?:\.\d+)?\b|LEMBAR|KATA\s+PENGANTAR|DAFTAR\s+(?:ISI|PUSTAKA|GAMBAR|TABEL)).+\s+(?:[ivxlcdm]+|\d+)\s*$",
                    raw_stripped,
                    re.IGNORECASE,
                )
            ):
                b_pos += 1
                continue

        role = classify_paragraph_role(p, raw_stripped, preset_id=preset_id, doc=source_doc)
        upper = txt.upper()

        # CV ATS header (Name + Location + Contact)
        if preset_id == "cv_ats" and not cv_seen_first_section:
            if role == "h1" or upper.rstrip(":") in CV_SECTION_HEADERS:
                cv_seen_first_section = True
                role = "h1"
            elif cv_header_count == 0 and len(txt.split()) <= 6:
                role = "cv_name"
                cv_header_count += 1
                raw_items.append(
                    {
                        "kind": "paragraph",
                        "role": role,
                        "text": txt,
                        "runs": [{"text": txt, "bold": True, "italic": False}],
                    }
                )
                b_pos += 1
                continue
            elif cv_header_count > 0 and cv_header_count <= 3 and (
                _is_cv_contact_line(txt) or len(txt) < 85
            ):
                role = "cv_contact"
                cv_header_count += 1
                raw_items.append(
                    {
                        "kind": "paragraph",
                        "role": role,
                        "text": txt,
                        "runs": [{"text": txt, "bold": False, "italic": False}],
                    }
                )
                b_pos += 1
                continue
            else:
                cv_seen_first_section = True

        # Artikel Jurnal header
        if preset_id == "jurnal_artikel" and len(raw_items) < 2 and role == "body" and len(txt) < 160:
            role = "journal_title" if len(raw_items) == 0 else "journal_author"
            if role == "journal_author":
                txt = ", ".join(normalize_academic_name(part) for part in txt.split(","))
            raw_items.append(
                {
                    "kind": "paragraph",
                    "role": role,
                    "text": txt,
                    "runs": [{"text": txt, "bold": (role == "journal_title"), "italic": False}],
                }
            )
            b_pos += 1
            continue

        # Laporan Kerja top title
        if (
            preset_id == "laporan_kerja"
            and len(raw_items) == 0
            and role == "body"
            and len(txt) < 115
            and upper.rstrip(":") not in WORK_REPORT_SECTION_HEADERS
        ):
            role = "h1"
            txt = txt.upper()

        # Remove old manual DAFTAR ISI
        if role == "h1" and upper == "DAFTAR ISI":
            in_kata_pengantar_section = False
            in_lembar_pengesahan_section = False
            if rules.get("toc", True) and preset.get("include_toc", True):
                skipping_old_manual_toc = True
                b_pos += 1
                continue

        if skipping_old_manual_toc:
            if role == "toc_item" or is_explicit_toc_line:
                b_pos += 1
                continue
            elif role == "h1":
                skipping_old_manual_toc = False
            elif len(txt) < 85 and not txt.endswith("."):
                b_pos += 1
                continue
            else:
                skipping_old_manual_toc = False

        if (role == "toc_item" or is_explicit_toc_line) and rules.get("toc", True) and preset.get("include_toc", True):
            b_pos += 1
            continue

        if role == "h1":
            if "KATA PENGANTAR" in upper or "PRAKATA" in upper:
                has_existing_kata_pengantar = True
                in_kata_pengantar_section = True
                in_lembar_pengesahan_section = False
            elif "LEMBAR PENGESAHAN" in upper or "HALAMAN PENGESAHAN" in upper:
                has_existing_lembar_pengesahan = True
                in_lembar_pengesahan_section = True
                in_kata_pengantar_section = False
            else:
                in_kata_pengantar_section = False
                in_lembar_pengesahan_section = False

        # Normalize BAB headings (e.g. "bab i pendahuluan" or "BAB I" + "PENDAHULUAN")
        if role == "h1":
            first_line = txt.splitlines()[0].strip()
            m_bab = ROMAN_CHAPTER_RE.match(first_line)
            if m_bab:
                bab_code = roman_from_arabic_bab(m_bab.group(1))
                bab_rest = (m_bab.group(3) or "").strip()
                if "\n" in txt:
                    rest_lines = " ".join(txt.splitlines()[1:]).strip()
                    txt = f"{bab_code}\n{rest_lines.upper()}"
                elif bab_rest:
                    txt = f"{bab_code}\n{bab_rest.upper()}"
                else:
                    look_pos = b_pos + 1
                    while look_pos < n_blocks and source_blocks[look_pos][0] == "paragraph" and not extract_paragraph_text_full(source_blocks[look_pos][1]).strip():
                        look_pos += 1
                    if look_pos < n_blocks and source_blocks[look_pos][0] == "paragraph":
                        next_txt = _clean_whitespace(extract_paragraph_text_full(source_blocks[look_pos][1]))
                        if (
                            next_txt
                            and len(next_txt) < 85
                            and not SUBCHAPTER_RE.match(next_txt)
                            and not ROMAN_CHAPTER_RE.match(next_txt)
                            and not next_txt.endswith(".")
                        ):
                            txt = f"{bab_code}\n{next_txt.upper()}"
                            b_pos = look_pos
                    else:
                        txt = bab_code
            else:
                txt = txt.upper() if preset.get("h1_uppercase", True) else smart_title_case_id(txt)

        # Normalize H2 / H3 Title Case whether user typed ALL CAPS ("1.2 TUJUAN MAGANG") or all lowercase ("1.1 latar belakang")
        if role in {"h2", "h3"} and (txt == txt.lower() or txt == txt.upper()):
            txt = smart_title_case_id(txt)

        # Track Bibliography section
        if role == "h1":
            if txt.upper() in {"DAFTAR PUSTAKA", "REFERENSI", "BIBLIOGRAFI"}:
                in_bibliography_section = True
            else:
                in_bibliography_section = False
        elif in_bibliography_section and role in {"body", "list_bullet", "list_number"}:
            role = "bib_item"

        # Handle glued signature block inside Lembar Pengesahan / Kata Pengantar
        if in_lembar_pengesahan_section and role == "body" and any(
            k in upper for k in ("MENYETUJUI", "NIDN.", "NIP.", "DOSEN PEMBIMBING", "PEMBIMBING INSTANSI")
        ):
            role = "signature_center"
            txt = "\n".join(split_glued_cover_text(txt))

        if in_kata_pengantar_section and role == "body" and len(txt) < 95:
            glued_parts = split_glued_cover_text(txt)
            if len(glued_parts) >= 2 and any(k in glued_parts[-1].upper() for k in ("PENULIS", "PENYUSUN")):
                sig_text = "\n".join(glued_parts[:-1]) + "\n\n\n" + glued_parts[-1]
                raw_items.append(
                    {
                        "kind": "paragraph",
                        "role": "signature",
                        "text": sig_text,
                        "runs": [{"text": sig_text, "bold": False, "italic": False}],
                    }
                )
                b_pos += 1
                continue

        # Align key-value lines and salutations in letters
        if preset_id in {"surat_resmi", "surat_lamaran", "laporan_kerja"} and role == "body":
            m_kv = re.match(
                r"^(Nomor|Lampiran|Perihal|Hal|Kepada|Hari/Tanggal|Tanggal|Waktu|Tempat,?\s*Tanggal\s*Lahir|Tempat|Acara|Nama|Pendidikan|Jabatan|Alamat|No\.?\s*HP)\s*:\s*(.+)$",
                txt,
                re.IGNORECASE,
            )
            if m_kv:
                raw_key = m_kv.group(1).strip()
                if "/" in raw_key:
                    key_label = "/".join(w.capitalize() for w in raw_key.split("/"))
                else:
                    key_label = smart_title_case_id(raw_key)
                val_text = m_kv.group(2).strip()
                k_low = key_label.lower()
                if k_low == "nomor":
                    val_text = "/".join(seg.strip().upper() for seg in val_text.split("/"))
                elif k_low == "nama":
                    val_text = normalize_academic_name(val_text)
                    if not merged_meta.get("author"):
                        merged_meta["author"] = val_text
                elif k_low in {"perihal", "hal"}:
                    val_text = smart_title_case_id(val_text)
                    if not merged_meta.get("title"):
                        merged_meta["title"] = val_text
                elif k_low in {"tempat", "acara", "pendidikan", "jabatan", "alamat", "hari/tanggal", "tanggal"} or "lahir" in k_low:
                    val_text = smart_title_case_id(val_text)
                elif k_low == "waktu":
                    val_text = re.sub(
                        r"\b(wib|wita|wit)\b",
                        lambda m: m.group(1).upper(),
                        val_text,
                        flags=re.IGNORECASE,
                    )
                pad = "\t\t: " if len(key_label) < 8 else ("\t: " if len(key_label) < 16 else " : ")
                txt = f"{key_label}{pad}{val_text}"
            else:
                m_yth = re.match(r"^(kepada\s+yth\.?|yth\.?)\s+(.+)$", txt, re.IGNORECASE)
                if m_yth:
                    txt = f"Kepada Yth. {smart_title_case_id(m_yth.group(2).strip())}"
                elif txt.strip().lower() in {"di tempat", "di - tempat"}:
                    txt = "di Tempat"

        trailing_sig = None
        if in_kata_pengantar_section and role == "body":
            txt, trailing_sig = split_inline_kata_pengantar_signature(txt)

        if role in {"body", "list_bullet", "list_number"} and txt == txt.lower():
            txt = smart_sentence_case_id(txt)

        # Preserve full runs (including hyperlinks, SDTs, textboxes)
        runs_spec = []
        if role in {"h1", "h2", "h3"}:
            runs_spec.append({"text": txt, "bold": True, "italic": False})
        elif txt == _clean_whitespace(full_text):
            extracted_runs = extract_paragraph_runs_full(p)
            for r_dict in extracted_runs:
                if r_dict["text"]:
                    cleaned_r = re.sub(r" {2,}", " ", r_dict["text"])
                    if cleaned_r:
                        runs_spec.append(
                            {
                                "text": cleaned_r,
                                "bold": bool(r_dict["bold"]),
                                "italic": bool(r_dict["italic"]),
                            }
                        )
            if not runs_spec:
                runs_spec.append({"text": txt, "bold": False, "italic": False})
        else:
            runs_spec.append({"text": txt, "bold": False, "italic": False})

        raw_items.append(
            {
                "kind": "paragraph",
                "role": role,
                "text": txt,
                "runs": runs_spec,
            }
        )
        if body_img_bytes:
            raw_items.append({"kind": "image", "image_bytes": body_img_bytes})
        if trailing_sig:
            raw_items.append(
                {
                    "kind": "paragraph",
                    "role": "signature",
                    "text": trailing_sig,
                    "runs": [{"text": trailing_sig, "bold": False, "italic": False}],
                }
            )
        if has_pb:
            raw_items.append({"kind": "page_break"})

        b_pos += 1

    # Mark last cv_contact item
    last_cv_contact_idx = -1
    for i_raw, it in enumerate(raw_items):
        if it.get("role") == "cv_contact":
            last_cv_contact_idx = i_raw
    if last_cv_contact_idx >= 0:
        raw_items[last_cv_contact_idx]["is_last_cv_contact"] = True

    out_doc = Document()

    normal_style = out_doc.styles["Normal"]
    if rules.get("font_family", True):
        normal_style.font.name = font_name
    if rules.get("font_size", True):
        normal_style.font.size = Pt(font_size_pt)

    def configure_section_geometry(sec):
        sec.page_width = Cm(float(preset.get("width_cm", 21.0)))
        sec.page_height = Cm(float(preset.get("height_cm", 29.7)))
        if rules.get("margins", True):
            sec.top_margin = Cm(float(preset["margin_top_cm"]))
            sec.bottom_margin = Cm(float(preset["margin_bottom_cm"]))
            sec.left_margin = Cm(float(preset["margin_left_cm"]))
            sec.right_margin = Cm(float(preset["margin_right_cm"]))

    configure_section_geometry(out_doc.sections[0])

    # Metadata resolution for Cover / Kop Surat / Extra Pages
    doc_title = merged_meta.get("title") or "JUDUL DOKUMEN"
    doc_label = merged_meta.get("doc_label") or (
        "SKRIPSI"
        if preset_id == "skripsi"
        else "LAPORAN MAGANG"
        if preset_id == "laporan_magang"
        else "PROPOSAL KEGIATAN"
        if preset_id == "proposal"
        else "MAKALAH"
    )
    course_name = merged_meta.get("course") or ""
    lecturer_name = merged_meta.get("lecturer") or ""
    author_name = merged_meta.get("author") or "Penulis"
    author_nim = merged_meta.get("nim") or ""
    study_program = merged_meta.get("study_program") or ""
    department = merged_meta.get("department") or ""
    faculty = merged_meta.get("faculty") or ""
    institution = merged_meta.get("institution") or ""
    city = merged_meta.get("city") or "Semarang"
    year = merged_meta.get("year") or "2026"
    logo_width_cm = float(merged_meta.get("logo_width_cm") or 3.8)
    logo_width_cm = min(8.0, max(1.5, logo_width_cm))
    logo_align = str(merged_meta.get("logo_align") or "center").strip().lower()
    logo_margin_top_pt = float(merged_meta.get("logo_margin_top_pt") or 8.0)
    # Split doc label glued in front of the title, e.g. "MAKALAH PEMANFAATAN AI ..." -> label + title
    _title_up = doc_title.strip().upper()
    for _lbl in sorted(COVER_DOC_LABELS, key=len, reverse=True):
        if _title_up.startswith(_lbl + " ") and len(_title_up) > len(_lbl) + 8:
            if not merged_meta.get("doc_label"):
                doc_label = _lbl
            doc_title = doc_title.strip()[len(_lbl):].strip(" :-")
            break

    # Normalize cover metadata casing & split glued institution blocks
    lecturer_name = normalize_academic_name(lecturer_name)
    if author_name and author_name != "Penulis":
        author_name = normalize_academic_name(author_name)
    author_nim = author_nim.strip().upper()
    inst_split = split_institution_block(
        " ".join(x for x in [study_program, department, faculty, institution] if x)
    )
    if inst_split:
        study_program = inst_split.get("study_program") or study_program
        department = inst_split.get("department") or (department if department and department.upper() not in (study_program or "").upper() else "")
        faculty = inst_split.get("faculty") or ""
        institution = inst_split.get("institution") or ""
        if inst_split.get("year"):
            year = inst_split["year"]
    if merged_meta.get("city"):
        city = str(merged_meta["city"]).strip().title()

    # =========================================================================
    # RULE 11: AUTO COVER / KOP SURAT OTOMATIS
    # =========================================================================
    if rules.get("auto_cover", True):
        if is_academic_cover_preset:
            p_type = out_doc.add_paragraph()
            p_type.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_type.paragraph_format.first_line_indent = Cm(0)
            p_type.paragraph_format.line_spacing = line_spacing
            p_type.paragraph_format.space_before = Pt(0)
            p_type.paragraph_format.space_after = Pt(10)
            r_t = p_type.add_run(doc_label.upper())
            set_run_font_ooxml(r_t, font_name, h1_size_pt, bold=True)

            p_title = out_doc.add_paragraph()
            p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_title.paragraph_format.first_line_indent = Cm(0)
            p_title.paragraph_format.line_spacing = line_spacing
            p_title.paragraph_format.space_after = Pt(18)
            r_ti = p_title.add_run(doc_title.upper())
            set_run_font_ooxml(r_ti, font_name, h1_size_pt, bold=True)

            p_purp = out_doc.add_paragraph()
            p_purp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_purp.paragraph_format.first_line_indent = Cm(0)
            p_purp.paragraph_format.line_spacing = line_spacing
            p_purp.paragraph_format.space_after = Pt(14)
            purp_label = (
                "Diajukan untuk memenuhi salah satu syarat memperoleh gelar Sarjana"
                if cover_style == "academic_skripsi"
                else "Diajukan sebagai salah satu syarat untuk menyelesaikan mata kuliah Kerja Praktik / Magang"
                if cover_style == "academic_magang"
                else "Diajukan sebagai usulan pelaksanaan kegiatan organisasi"
                if cover_style == "proposal_cover"
                else ("Disusun untuk memenuhi tugas mata kuliah" if course_name else "")
            )
            if purp_label:
                r_p1 = p_purp.add_run(purp_label + ("\n" if (cover_style == "academic_makalah" and course_name) else ""))
                set_run_font_ooxml(r_p1, font_name, font_size_pt, bold=False)
            if cover_style == "academic_makalah" and course_name:
                r_p2 = p_purp.add_run(course_name.upper())
                set_run_font_ooxml(r_p2, font_name, font_size_pt, bold=True)

            if lecturer_name:
                p_lec = out_doc.add_paragraph()
                p_lec.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_lec.paragraph_format.first_line_indent = Cm(0)
                p_lec.paragraph_format.line_spacing = line_spacing
                p_lec.paragraph_format.space_after = Pt(16)
                lec_label = (
                    "Dosen Pembimbing:"
                    if cover_style in {"academic_skripsi", "academic_magang"}
                    else "Dosen Pengampu:"
                )
                r_l1 = p_lec.add_run(f"{lec_label}\n{lecturer_name}")
                set_run_font_ooxml(r_l1, font_name, font_size_pt, bold=False)

            p_logo = out_doc.add_paragraph()
            if logo_align == "left":
                p_logo.alignment = WD_ALIGN_PARAGRAPH.LEFT
            elif logo_align == "right":
                p_logo.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else:
                p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_logo.paragraph_format.first_line_indent = Cm(0)
            p_logo.paragraph_format.space_before = Pt(max(0.0, min(60.0, logo_margin_top_pt)))
            p_logo.paragraph_format.space_after = Pt(18)
            try:
                add_logo_fit_box(p_logo.add_run(), effective_logo_b64, logo_width_cm, logo_width_cm)
            except Exception:
                pass

            p_auth = out_doc.add_paragraph()
            p_auth.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_auth.paragraph_format.first_line_indent = Cm(0)
            p_auth.paragraph_format.line_spacing = line_spacing
            p_auth.paragraph_format.space_after = Pt(18)
            r_a1 = p_auth.add_run("Disusun oleh:\n")
            set_run_font_ooxml(r_a1, font_name, font_size_pt, bold=False)
            author_line = (
                f"{author_name.upper()} ({author_nim})"
                if author_nim and author_nim not in author_name
                else author_name.upper()
            )
            r_a2 = p_auth.add_run(author_line)
            set_run_font_ooxml(r_a2, font_name, font_size_pt, bold=True)

            inst_lines = []
            for raw_l in [study_program, department, faculty, institution, year]:
                if raw_l and str(raw_l).strip():
                    up_l = str(raw_l).strip().upper()
                    if up_l not in inst_lines:
                        inst_lines.append(up_l)
            if inst_lines:
                p_inst = out_doc.add_paragraph()
                p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_inst.paragraph_format.first_line_indent = Cm(0)
                p_inst.paragraph_format.line_spacing = line_spacing
                p_inst.paragraph_format.space_after = Pt(0)
                r_inst = p_inst.add_run("\n".join(inst_lines))
                set_run_font_ooxml(r_inst, font_name, font_size_pt + 1, bold=True)

            out_doc.add_page_break()

        elif cover_style == "kop_surat":
            if effective_logo_b64:
                p_kop_logo = out_doc.add_paragraph()
                p_kop_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_kop_logo.paragraph_format.first_line_indent = Cm(0)
                p_kop_logo.paragraph_format.space_after = Pt(4)
                try:
                    add_logo_fit_box(p_kop_logo.add_run(), effective_logo_b64, 2.6, 2.2)
                except Exception:
                    pass

            kop_inst = institution or "INSTANSI / ORGANISASI"
            kop_fac = faculty or "BAGIAN ADMINISTRASI UMUM"
            p_kop = out_doc.add_paragraph()
            p_kop.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_kop.paragraph_format.first_line_indent = Cm(0)
            p_kop.paragraph_format.line_spacing = 1.15
            p_kop.paragraph_format.space_after = Pt(12)
            r_k1 = p_kop.add_run(f"{kop_inst.upper()}\n{kop_fac.upper()}\n")
            set_run_font_ooxml(r_k1, font_name, h1_size_pt, bold=True)
            r_k2 = p_kop.add_run(
                f"{city.title()} • Telp. (024) 8508100 • Email: sekretariat@instansi.ac.id"
            )
            set_run_font_ooxml(r_k2, font_name, font_size_pt - 1, bold=False)
            add_bottom_border_to_paragraph(p_kop, size_eighth_pt=18)

            has_existing_nomor = any(
                item.get("kind") == "paragraph" and "NOMOR" in item["text"].upper()[:20]
                for item in raw_items[:6]
            )
            if preset_id == "surat_resmi" and not has_existing_nomor:
                p_meta = out_doc.add_paragraph()
                p_meta.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p_meta.paragraph_format.first_line_indent = Cm(0)
                p_meta.paragraph_format.line_spacing = line_spacing
                p_meta.paragraph_format.space_after = Pt(12)
                r_m = p_meta.add_run(
                    f"Nomor\t\t: 042/INST/{year}\n"
                    f"Lampiran\t: 1 (Satu) Berkas\n"
                    f"Perihal\t\t: {doc_title.title()}"
                )
                set_run_font_ooxml(r_m, font_name, font_size_pt, bold=False)

    # =========================================================================
    # RULE 12 (FRONT MATTER): EXTRA PAGES
    # =========================================================================
    extra_page_type = preset.get("extra_page_type", "none")
    if rules.get("extra_pages", True):
        if (
            extra_page_type
            in {
                "lembar_pengesahan_dan_kata_pengantar",
                "lembar_pengesahan_proposal",
                "lembar_pengesahan_magang",
            }
            and not has_existing_lembar_pengesahan
        ):
            p_lp = out_doc.add_paragraph(style="Heading 1")
            p_lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_lp.paragraph_format.first_line_indent = Cm(0)
            p_lp.paragraph_format.space_after = Pt(14)
            r_lp = p_lp.add_run("LEMBAR PENGESAHAN")
            set_run_font_ooxml(r_lp, font_name, h1_size_pt, bold=True)
            set_outline_level_ooxml(p_lp, 0)

            p_lp_body = out_doc.add_paragraph()
            p_lp_body.alignment = body_align
            p_lp_body.paragraph_format.first_line_indent = Cm(first_indent_cm if first_indent_cm > 0 else 0)
            p_lp_body.paragraph_format.line_spacing = line_spacing
            p_lp_body.paragraph_format.space_after = Pt(18)
            r_lpb = p_lp_body.add_run(
                f"Dokumen berjudul \"{smart_title_case_id(doc_title)}\" yang disusun oleh {normalize_academic_name(author_name)} "
                f"{f'({author_nim}) ' if author_nim else ''}telah diperiksa dan disetujui pada tahun {year}."
            )
            set_run_font_ooxml(r_lpb, font_name, font_size_pt)

            p_lp_sig = out_doc.add_paragraph()
            p_lp_sig.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_lp_sig.paragraph_format.first_line_indent = Cm(0)
            p_lp_sig.paragraph_format.line_spacing = line_spacing
            r_lps = p_lp_sig.add_run(
                f"Mengetahui dan Menyetujui,\nDosen Pembimbing / Pengampu\n\n\n\n"
                f"{lecturer_name or 'Dosen Pembimbing'}\nNIP. 198504122012121002"
            )
            set_run_font_ooxml(r_lps, font_name, font_size_pt, bold=False)
            out_doc.add_page_break()

        if (
            extra_page_type
            in {
                "kata_pengantar",
                "lembar_pengesahan_dan_kata_pengantar",
                "lembar_pengesahan_magang",
            }
            and not has_existing_kata_pengantar
        ):
            p_kp = out_doc.add_paragraph(style="Heading 1")
            p_kp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_kp.paragraph_format.first_line_indent = Cm(0)
            p_kp.paragraph_format.space_after = Pt(14)
            r_kp = p_kp.add_run("KATA PENGANTAR")
            set_run_font_ooxml(r_kp, font_name, h1_size_pt, bold=True)
            set_outline_level_ooxml(p_kp, 0)

            kp_paragraphs = [
                (
                    f"Puji syukur ke hadirat Tuhan Yang Maha Esa karena atas rahmat dan karunia-Nya, "
                    f"dokumen yang berjudul \"{smart_title_case_id(doc_title)}\" ini dapat diselesaikan dengan baik "
                    f"dan tepat pada waktunya."
                ),
                (
                    f"Penulisan dokumen ini disusun sebagai bagian dari {smart_title_case_id(course_name) if course_name else 'kegiatan akademik'} "
                    f"serta diharapkan dapat menambah wawasan dan pemahaman secara komprehensif bagi pembaca."
                ),
                (
                    "Penulis menyadari bahwa dokumen ini masih jauh dari sempurna. Oleh karena itu, "
                    "kritik dan saran yang bersifat membangun sangat diharapkan demi penyempurnaan di masa mendatang."
                ),
            ]
            for kp_txt in kp_paragraphs:
                p_k = out_doc.add_paragraph()
                p_k.alignment = body_align
                p_k.paragraph_format.line_spacing = line_spacing
                if rules.get("indentation", True) and first_indent_cm > 0:
                    p_k.paragraph_format.first_line_indent = Cm(first_indent_cm)
                p_k.paragraph_format.space_after = Pt(space_after_pt)
                r_k = p_k.add_run(kp_txt)
                set_run_font_ooxml(r_k, font_name, font_size_pt)

            p_sign = out_doc.add_paragraph()
            p_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            p_sign.paragraph_format.first_line_indent = Cm(0)
            p_sign.paragraph_format.space_before = Pt(18)
            p_sign.paragraph_format.line_spacing = line_spacing
            r_sg = p_sign.add_run(f"{city.title()}, November {year}\n\n\n{author_name.title()}")
            set_run_font_ooxml(r_sg, font_name, font_size_pt)
            out_doc.add_page_break()

    # =========================================================================
    # Split raw_items into front_items and main_items
    # =========================================================================
    front_items: List[Dict[str, Any]] = []
    main_items: List[Dict[str, Any]] = []
    reached_main = not preset.get("use_roman_front_matter", True)

    for item in raw_items:
        if not reached_main and item.get("kind") == "paragraph":
            txt_up = item["text"].upper()
            first_line_up = txt_up.splitlines()[0].strip()
            if (
                txt_up.startswith("BAB I")
                or txt_up.startswith("BAB 1")
                or ROMAN_CHAPTER_RE.match(first_line_up)
                or (
                    item["role"] == "h1"
                    and first_line_up
                    not in {
                        "KATA PENGANTAR",
                        "PRAKATA",
                        "DAFTAR ISI",
                        "ABSTRAK",
                        "ABSTRACT",
                        "RINGKASAN",
                        "LEMBAR PENGESAHAN",
                        "HALAMAN PENGESAHAN",
                    }
                )
            ):
                reached_main = True
        if reached_main:
            main_items.append(item)
        else:
            front_items.append(item)

    if not main_items and front_items:
        main_items = front_items
        front_items = []

    while front_items and front_items[0].get("kind") == "page_break":
        front_items.pop(0)
    while front_items and front_items[-1].get("kind") == "page_break":
        front_items.pop()
    while main_items and main_items[0].get("kind") == "page_break":
        main_items.pop(0)
    while main_items and main_items[-1].get("kind") == "page_break":
        main_items.pop()

    # Ensure normal chapter content flows continuously without spurious manual page breaks from messy source files.
    # Academic chapters (BAB) automatically get their page breaks applied before each H1.
    cleaned_main_items = []
    for item in main_items:
        if item.get("kind") == "page_break":
            continue
        cleaned_main_items.append(item)
    main_items = cleaned_main_items

    for f_item in front_items[-3:]:
        if f_item.get("kind") == "paragraph" and f_item.get("role") == "body":
            t_strip = f_item["text"].strip()
            t_up = t_strip.upper()
            if len(t_strip) < 48 and (
                DATE_SIGNATURE_RE.match(t_strip)
                or t_up in {"PENULIS", "PENYUSUN", "TIM PENYUSUN", "HORMAT KAMI", "HORMAT SAYA"}
                or re.match(r"^[A-Za-z\s]+,\s*20\d{2}$", t_strip)
            ):
                f_item["role"] = "signature"

    # =========================================================================
    # Pre-scan headings to build TOC entries if RULE 10 (toc) is enabled
    # =========================================================================
    toc_entries: List[Tuple[str, str, str]] = []
    if rules.get("toc", True) and preset.get("include_toc", True):
        roman_pg_idx = 2
        if has_existing_lembar_pengesahan or (
            rules.get("extra_pages", True)
            and extra_page_type in {
                "lembar_pengesahan_dan_kata_pengantar",
                "lembar_pengesahan_proposal",
                "lembar_pengesahan_magang",
            }
        ):
            toc_entries.append(("h1", "LEMBAR PENGESAHAN", "ii"))
            roman_pg_idx += 1

        if has_existing_kata_pengantar or (
            rules.get("extra_pages", True)
            and extra_page_type in {"kata_pengantar", "lembar_pengesahan_dan_kata_pengantar", "lembar_pengesahan_magang"}
        ):
            r_str = "ii" if roman_pg_idx == 2 else "iii"
            toc_entries.append(("h1", "KATA PENGANTAR", r_str))
            roman_pg_idx += 1

        r_str = "ii" if roman_pg_idx == 2 else ("iii" if roman_pg_idx == 3 else "iv")
        toc_entries.append(("h1", "DAFTAR ISI", r_str))

        est_arabic_page = 1
        text_w_cm = float(preset.get("width_cm", 21.0)) - float(preset["margin_left_cm"]) - float(preset["margin_right_cm"])
        text_h_cm = float(preset.get("height_cm", 29.7)) - float(preset["margin_top_cm"]) - float(preset["margin_bottom_cm"])
        em_cm = font_size_pt * 0.03528
        chars_per_line = max(30, int(text_w_cm / (em_cm * 0.48)))
        line_h_cm = em_cm * 1.15 * line_spacing
        lines_per_page = max(18, int(text_h_cm / line_h_cm))
        para_gap_lines = (space_after_pt + space_before_pt) / max(1.0, font_size_pt * 1.15 * line_spacing)
        used_lines = 0.0
        seen_first_h1 = False

        def _consume(n_lines: float):
            nonlocal used_lines, est_arabic_page
            used_lines += n_lines
            while used_lines > lines_per_page:
                used_lines -= lines_per_page
                est_arabic_page += 1

        for item in main_items:
            kind_i = item.get("kind")
            if kind_i == "table":
                _consume(len(item.get("rows", [])) * 1.25 + 1)
                continue
            if kind_i == "image":
                _consume(10)
                continue
            if kind_i == "page_break":
                if used_lines > 0:
                    est_arabic_page += 1
                    used_lines = 0
                continue
            if kind_i != "paragraph":
                continue
            r_role = item["role"]
            r_txt = item["text"]
            if r_role == "h1":
                up = r_txt.upper()
                if up in {"DAFTAR ISI", "KATA PENGANTAR", "LEMBAR PENGESAHAN"}:
                    continue
                if seen_first_h1 and preset.get("chapter_page_break", True) and used_lines > 0:
                    est_arabic_page += 1
                    used_lines = 0
                seen_first_h1 = True
                toc_entries.append(("h1", r_txt, str(est_arabic_page)))
                _consume(3.5)
            elif r_role in {"h2", "h3"}:
                if used_lines > lines_per_page - 3:
                    est_arabic_page += 1
                    used_lines = 0
                toc_entries.append((r_role, r_txt, str(est_arabic_page)))
                _consume(1.6)
            else:
                n = sum(max(1, -(-len(seg) // chars_per_line)) for seg in r_txt.split("\n"))
                _consume(n + para_gap_lines)

    # Helper to render paragraphs + interleaved tables + images in exact order
    def render_items(items_list: List[Dict[str, Any]], is_main_section: bool):
        seen_first_chapter = False
        for item in items_list:
            kind = item.get("kind")
            if kind == "page_break":
                out_doc.add_page_break()
                continue

            if kind == "image":
                p_img = out_doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.first_line_indent = Cm(0)
                p_img.paragraph_format.space_before = Pt(8)
                p_img.paragraph_format.space_after = Pt(8)
                try:
                    p_img.add_run().add_picture(io.BytesIO(item["image_bytes"]), width=Cm(11.0))
                except Exception:
                    pass
                continue

            if kind == "table":
                tbl_rows = item["rows"]
                cols = max(len(r) for r in tbl_rows)
                tbl = out_doc.add_table(rows=len(tbl_rows), cols=cols)
                tbl.style = "Table Grid"
                for r_idx, r_data in enumerate(tbl_rows):
                    for c_idx, val in enumerate(r_data):
                        if c_idx < cols:
                            cell_p = tbl.cell(r_idx, c_idx).paragraphs[0]
                            cell_p.text = ""
                            cell_p.paragraph_format.first_line_indent = Cm(0)
                            cell_p.paragraph_format.line_spacing = 1.15
                            cell_p.paragraph_format.space_before = Pt(2)
                            cell_p.paragraph_format.space_after = Pt(2)
                            run = cell_p.add_run(val)
                            set_run_font_ooxml(
                                run,
                                font_name if rules.get("font_family", True) else "Times New Roman",
                                table_font_size_pt if rules.get("font_size", True) else 11.0,
                                bold=(r_idx == 0),
                            )
                p_sp = out_doc.add_paragraph()
                p_sp.paragraph_format.space_before = Pt(0)
                p_sp.paragraph_format.space_after = Pt(4)
                continue

            role = item["role"]
            text = item["text"]
            runs_data = item["runs"]

            if role == "h1" and text.upper() == "DAFTAR ISI" and rules.get("toc", True) and preset.get("include_toc", True):
                continue

            if (
                role == "h1"
                and rules.get("headings", True)
                and preset.get("chapter_page_break", True)
            ):
                if seen_first_chapter:
                    out_doc.add_page_break()
                seen_first_chapter = True

            # Choose Word style cleanly without duplicating list prefixes
            has_explicit_num = bool(re.match(r"^(\d+|[a-z])[\.\)]\s+", text))
            has_explicit_bullet = text.startswith(("• ", "- ", "* "))
            if role == "h1":
                style_to_use = "Heading 1"
            elif role == "h2":
                style_to_use = "Heading 2"
            elif role == "h3":
                style_to_use = "Heading 3"
            elif role == "list_bullet" and not has_explicit_bullet:
                style_to_use = "List Bullet"
            elif role == "list_number" and not has_explicit_num:
                style_to_use = "List Number"
            else:
                style_to_use = "Normal"

            p = out_doc.add_paragraph(style=style_to_use)
            pf = p.paragraph_format

            if rules.get("line_spacing", True):
                pf.line_spacing = line_spacing

            if rules.get("paragraph_spacing", True):
                if role == "h1":
                    pf.space_before = Pt(10 if preset_id == "cv_ats" else 0)
                    pf.space_after = Pt(4 if preset_id == "cv_ats" else 12)
                elif role in {"h2", "h3"}:
                    pf.space_before = Pt(6 if preset_id == "cv_ats" else 10)
                    pf.space_after = Pt(2 if preset_id == "cv_ats" else 4)
                else:
                    pf.space_before = Pt(space_before_pt)
                    pf.space_after = Pt(space_after_pt)

            if role == "cv_name":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pf.first_line_indent = Cm(0)
                pf.space_before = Pt(0)
                pf.space_after = Pt(2)
                r = p.add_run(text.upper())
                set_run_font_ooxml(r, font_name, 16.0, bold=True)

            elif role == "cv_contact":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pf.first_line_indent = Cm(0)
                pf.space_before = Pt(0)
                pf.space_after = Pt(8 if item.get("is_last_cv_contact") else 2)
                r = p.add_run(text)
                set_run_font_ooxml(r, font_name, 10.0, bold=False)
                if item.get("is_last_cv_contact"):
                    add_bottom_border_to_paragraph(p, size_eighth_pt=12)

            elif role == "journal_title":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pf.first_line_indent = Cm(0)
                pf.space_after = Pt(6)
                r = p.add_run(text.upper())
                set_run_font_ooxml(r, font_name, 14.0, bold=True)

            elif role == "journal_author":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pf.first_line_indent = Cm(0)
                pf.space_after = Pt(12)
                r = p.add_run(text)
                set_run_font_ooxml(r, font_name, font_size_pt, bold=False)

            elif role == "cover_line":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pf.first_line_indent = Cm(0)
                r = p.add_run(text)
                set_run_font_ooxml(r, font_name, font_size_pt, bold=True)

            elif role == "signature_center":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pf.first_line_indent = Cm(0)
                pf.space_before = Pt(14)
                r = p.add_run(text)
                set_run_font_ooxml(r, font_name, font_size_pt, bold=False)

            elif role == "signature":
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                pf.first_line_indent = Cm(0)
                pf.space_before = Pt(12)
                r = p.add_run(text)
                set_run_font_ooxml(r, font_name, font_size_pt, bold=False)

            elif role == "bib_item":
                p.alignment = body_align if rules.get("alignment", True) else WD_ALIGN_PARAGRAPH.LEFT
                pf.left_indent = Cm(1.25)
                pf.first_line_indent = Cm(-1.25)
                for r_spec in runs_data:
                    r = p.add_run(r_spec["text"])
                    set_run_font_ooxml(
                        r,
                        font_name if rules.get("font_family", True) else "Times New Roman",
                        font_size_pt if rules.get("font_size", True) else 12.0,
                        bold=r_spec["bold"],
                        italic=r_spec["italic"],
                    )

            elif role == "h1":
                if rules.get("headings", True):
                    p.alignment = h1_align
                    pf.first_line_indent = Cm(0)
                    set_outline_level_ooxml(p, 0)
                    display_text = text.upper() if preset.get("h1_uppercase", True) else text
                    r = p.add_run(display_text)
                    set_run_font_ooxml(
                        r,
                        font_name if rules.get("font_family", True) else "Times New Roman",
                        h1_size_pt if rules.get("font_size", True) else 14.0,
                        bold=True,
                    )
                    if preset_id == "cv_ats":
                        add_bottom_border_to_paragraph(p, size_eighth_pt=6)
                else:
                    r = p.add_run(text)
                    set_run_font_ooxml(r, font_name, font_size_pt, bold=True)

            elif role in {"h2", "h3"}:
                if rules.get("headings", True):
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    pf.first_line_indent = Cm(0)
                    set_outline_level_ooxml(p, 1 if role == "h2" else 2)
                    target_h_size = h2_size_pt if role == "h2" else h3_size_pt
                    r = p.add_run(text)
                    set_run_font_ooxml(
                        r,
                        font_name if rules.get("font_family", True) else "Times New Roman",
                        target_h_size if rules.get("font_size", True) else 12.0,
                        bold=True,
                    )
                else:
                    r = p.add_run(text)
                    set_run_font_ooxml(r, font_name, font_size_pt, bold=True)

            elif role in {"list_bullet", "list_number"}:
                if rules.get("alignment", True):
                    p.alignment = body_align
                if style_to_use == "Normal":
                    pf.left_indent = Cm(0.85)
                    pf.first_line_indent = Cm(-0.45)
                else:
                    pf.first_line_indent = Cm(0)
                for r_spec in runs_data:
                    r = p.add_run(r_spec["text"])
                    set_run_font_ooxml(
                        r,
                        font_name if rules.get("font_family", True) else "Times New Roman",
                        font_size_pt if rules.get("font_size", True) else 12.0,
                        bold=r_spec["bold"],
                        italic=r_spec["italic"],
                    )

            else:
                if rules.get("alignment", True):
                    p.alignment = body_align
                if rules.get("indentation", True) and first_indent_cm > 0:
                    if not text.startswith((
                        "Nomor", "Lampiran", "Perihal", "Kepada", "Yth.", "Hal",
                        "Hari/Tanggal", "Tanggal", "Waktu", "Tempat", "Acara",
                        "Nama", "Pendidikan", "Jabatan", "Alamat", "No.", "di Tempat",
                        "Dengan hormat", "Kata Kunci:", "Kata kunci:",
                    )):
                        pf.first_line_indent = Cm(first_indent_cm)
                    else:
                        pf.first_line_indent = Cm(0)
                else:
                    pf.first_line_indent = Cm(0)

                for r_spec in runs_data:
                    r = p.add_run(r_spec["text"])
                    set_run_font_ooxml(
                        r,
                        font_name if rules.get("font_family", True) else "Times New Roman",
                        font_size_pt if rules.get("font_size", True) else 12.0,
                        bold=r_spec["bold"],
                        italic=r_spec["italic"],
                    )

    if front_items:
        render_items(front_items, is_main_section=False)
        if rules.get("toc", True) and preset.get("include_toc", True) and toc_entries:
            out_doc.add_page_break()

    if rules.get("toc", True) and preset.get("include_toc", True) and toc_entries:
        insert_toc_field_paragraph(out_doc, toc_entries, font_name, font_size_pt, h1_size_pt)

    use_roman_split = (
        rules.get("page_numbering", True)
        and preset.get("use_roman_front_matter", True)
        and (
            rules.get("auto_cover", True)
            or rules.get("extra_pages", True)
            or rules.get("toc", True)
            or bool(front_items)
        )
    )

    if use_roman_split:
        sec_front = out_doc.sections[0]
        sec_front.different_first_page_header_footer = True
        set_section_page_number_format(sec_front, fmt="lowerRoman", start=1)
        add_page_number_field_to_footer(sec_front, font_name, font_size_pt - 1)

        sec_main = out_doc.add_section(WD_SECTION.NEW_PAGE)
        configure_section_geometry(sec_main)
        sec_main.different_first_page_header_footer = False
        set_section_page_number_format(sec_main, fmt="decimal", start=1)
        add_page_number_field_to_footer(sec_main, font_name, font_size_pt - 1)
    elif rules.get("page_numbering", True):
        sec0 = out_doc.sections[0]
        set_section_page_number_format(sec0, fmt="decimal", start=1)
        add_page_number_field_to_footer(sec0, font_name, font_size_pt - 1)

    render_items(main_items, is_main_section=True)

    has_existing_end_sig = any(
        item.get("kind") == "paragraph"
        and any(k in item["text"].upper() for k in ("HORMAT SAYA", "MENGETAHUI", "NIP."))
        for item in main_items[-4:]
    )
    if rules.get("extra_pages", True) and not has_existing_end_sig:
        if extra_page_type == "blok_tanda_tangan":
            p_sig = out_doc.add_paragraph()
            p_sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            p_sig.paragraph_format.first_line_indent = Cm(0)
            p_sig.paragraph_format.space_before = Pt(24)
            p_sig.paragraph_format.line_spacing = line_spacing
            r_sig = p_sig.add_run(
                f"{city.title()}, 21 November {year}\n"
                f"Mengetahui,\n"
                f"Pimpinan {smart_title_case_id(institution or 'Instansi')}\n\n\n\n"
                f"{lecturer_name or 'Pimpinan Instansi'}\n"
                f"NIP. 198504122012121002"
            )
            set_run_font_ooxml(r_sig, font_name, font_size_pt)
        elif extra_page_type == "blok_ttd_pelamar":
            p_sig = out_doc.add_paragraph()
            p_sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            p_sig.paragraph_format.first_line_indent = Cm(0)
            p_sig.paragraph_format.space_before = Pt(20)
            p_sig.paragraph_format.line_spacing = line_spacing
            r_sig = p_sig.add_run(
                f"{city.title()}, 21 November {year}\n"
                f"Hormat saya,\n\n\n\n"
                f"{normalize_academic_name(author_name)}"
            )
            set_run_font_ooxml(r_sig, font_name, font_size_pt)

    return out_doc
