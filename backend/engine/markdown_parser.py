import base64
import io
import re
from typing import Dict, Any, List, Tuple, Optional
from docx import Document
from PIL import Image
from .ooxml_reader import (
    iter_document_blocks,
    extract_paragraph_text_full,
    split_glued_cover_text,
)


ROMAN_CHAPTER_RE = re.compile(
    r"^(BAB\s+[IVXLCDM0-9]+)(\s*[:\-–—]?\s*(.*))?$",
    re.IGNORECASE,
)
SUBCHAPTER_RE = re.compile(r"^(\d+\.\d+(?:\.\d+)?)\.?\s*[:\-–—]?\s+(.+)$")
LETTER_SUBHEAD_RE = re.compile(r"^([A-Z])\.\s+([A-Z][A-Za-z0-9\s,\-/()]{2,70})$")
NUMBERED_ITEM_RE = re.compile(r"^(\d+)[\.\)]\s+(.+)$")
ALPHA_ITEM_RE = re.compile(r"^([a-z])[\.\)]\s+(.+)$")
BULLET_ITEM_RE = re.compile(r"^[\-\*\•]\s+(.+)$")
PAGE_BREAK_RE = re.compile(r"^(\-{3,}|\*{3,}|_{3,})$")

SPECIAL_H1_TITLES = {
    "KATA PENGANTAR",
    "PRAKATA",
    "DAFTAR ISI",
    "DAFTAR TABEL",
    "DAFTAR GAMBAR",
    "DAFTAR LAMPIRAN",
    "DAFTAR PUSTAKA",
    "REFERENSI",
    "BIBLIOGRAFI",
    "LAMPIRAN",
    "ABSTRAK",
    "ABSTRACT",
    "RINGKASAN",
    "LEMBAR PENGESAHAN",
    "HALAMAN PENGESAHAN",
}

ACADEMIC_SECTION_START_TITLES = {
    "KATA PENGANTAR",
    "PRAKATA",
    "DAFTAR ISI",
    "LEMBAR PENGESAHAN",
    "HALAMAN PENGESAHAN",
    "ABSTRAK",
    "ABSTRACT",
}

COVER_DOC_LABELS = {
    "MAKALAH",
    "PROPOSAL",
    "PROPOSAL KEGIATAN",
    "SKRIPSI",
    "TUGAS AKHIR",
    "LAPORAN",
    "LAPORAN MAGANG",
    "LAPORAN PKL",
    "LAPORAN PRAKTIK KERJA LAPANGAN",
    "LAPORAN KKN",
}

ACADEMIC_COVER_PRESETS = {"makalah", "skripsi", "laporan_magang", "proposal"}

CV_SECTION_HEADERS = {
    "RINGKASAN PROFESIONAL",
    "RINGKASAN PROFIL",
    "RINGKASAN",
    "PROFIL",
    "PROFIL SINGKAT",
    "TENTANG SAYA",
    "PROFESSIONAL SUMMARY",
    "SUMMARY",
    "PENDIDIKAN",
    "RIWAYAT PENDIDIKAN",
    "EDUCATION",
    "PENGALAMAN KERJA",
    "PENGALAMAN PROFESIONAL",
    "PENGALAMAN MAGANG",
    "PENGALAMAN",
    "WORK EXPERIENCE",
    "EXPERIENCE",
    "PENGALAMAN PROYEK",
    "PROYEK",
    "PROYEK & PORTOFOLIO",
    "PORTOFOLIO",
    "PROJECTS",
    "PENGALAMAN ORGANISASI",
    "ORGANISASI",
    "KEAHLIAN",
    "KEAHLIAN & KOMPETENSI",
    "KEAHLIAN TEKNIS",
    "KETERAMPILAN",
    "KOMPETENSI",
    "SKILLS",
    "TECHNICAL SKILLS",
    "HARD SKILLS",
    "SOFT SKILLS",
    "SERTIFIKASI",
    "LISENSI & SERTIFIKASI",
    "PELATIHAN",
    "CERTIFICATIONS",
    "PRESTASI",
    "PENGHARGAAN",
    "BAHASA",
    "LANGUAGES",
    "REFERENSI",
}

JOURNAL_SECTION_HEADERS = {
    "ABSTRAK",
    "ABSTRACT",
    "PENDAHULUAN",
    "TINJAUAN PUSTAKA",
    "KAJIAN PUSTAKA",
    "METODE",
    "METODE PENELITIAN",
    "METODOLOGI",
    "HASIL DAN PEMBAHASAN",
    "PEMBAHASAN",
    "KESIMPULAN",
    "SIMPULAN",
    "KESIMPULAN DAN SARAN",
    "UCAPAN TERIMA KASIH",
    "DAFTAR PUSTAKA",
    "REFERENSI",
}

PROPOSAL_SECTION_HEADERS = {
    "PENDAHULUAN",
    "LATAR BELAKANG",
    "DASAR PEMIKIRAN",
    "LANDASAN KEGIATAN",
    "NAMA KEGIATAN",
    "TEMA KEGIATAN",
    "NAMA DAN TEMA KEGIATAN",
    "TUJUAN",
    "TUJUAN KEGIATAN",
    "MANFAAT",
    "MANFAAT KEGIATAN",
    "SASARAN",
    "SASARAN KEGIATAN",
    "PESERTA",
    "PESERTA KEGIATAN",
    "SASARAN DAN PESERTA",
    "BENTUK KEGIATAN",
    "WAKTU DAN TEMPAT",
    "WAKTU DAN TEMPAT KEGIATAN",
    "WAKTU DAN TEMPAT PELAKSANAAN",
    "WAKTU PELAKSANAAN",
    "JADWAL KEGIATAN",
    "SUSUNAN ACARA",
    "SUSUNAN PANITIA",
    "KEPANITIAAN",
    "ANGGARAN DANA",
    "ESTIMASI BIAYA",
    "RENCANA ANGGARAN BIAYA",
    "RINCIAN ANGGARAN",
    "PENUTUP",
    "LAMPIRAN",
}

WORK_REPORT_SECTION_HEADERS = {
    "PENDAHULUAN",
    "LATAR BELAKANG",
    "TUJUAN",
    "RUANG LINGKUP",
    "RINCIAN KEGIATAN",
    "URAIAN KEGIATAN",
    "PELAKSANAAN KEGIATAN",
    "HASIL KEGIATAN",
    "CAPAIAN KINERJA",
    "EVALUASI",
    "KENDALA",
    "HAMBATAN",
    "KENDALA DAN SOLUSI",
    "PEMBAHASAN",
    "KESIMPULAN",
    "SIMPULAN",
    "SARAN",
    "REKOMENDASI",
    "KESIMPULAN DAN SARAN",
    "PENUTUP",
}

_STOPWORDS_ID = {
    "dan", "atau", "di", "ke", "dari", "yang", "untuk", "pada", "dalam",
    "dengan", "terhadap", "serta", "bagi", "oleh", "sebagai", "tentang",
    "atas", "guna", "secara", "melalui",
}

_ACRONYMS_ID = {
    "ai": "AI",
    "umkm": "UMKM",
    "ui": "UI",
    "ux": "UX",
    "ui/ux": "UI/UX",
    "it": "IT",
    "ti": "TI",
    "sop": "SOP",
    "html": "HTML",
    "css": "CSS",
    "sql": "SQL",
    "api": "API",
    "pdf": "PDF",
    "docx": "DOCX",
    "ram": "RAM",
    "cpu": "CPU",
    "rom": "ROM",
    "pc": "PC",
    "os": "OS",
    "iot": "IoT",
    "s1": "S1",
    "d3": "D3",
    "sma": "SMA",
    "smk": "SMK",
    "smp": "SMP",
    "sd": "SD",
    "pkl": "PKL",
    "kkn": "KKN",
    "bem": "BEM",
    "hmsi": "HMSI",
    "pt": "PT",
    "cv": "CV",
    "hrd": "HRD",
    "ats": "ATS",
    "ipk": "IPK",
    "nip": "NIP",
    "nim": "NIM",
    "npm": "NPM",
    "usm": "USM",
    "unnes": "UNNES",
    "wib": "WIB",
    "wita": "WITA",
    "wit": "WIT",
    "ooxml": "OOXML",
    "toc": "TOC",
    "swt": "SWT",
    "saw": "SAW",
    "spk": "SPK",
    "rab": "RAB",
    "lpj": "LPJ",
    "ukm": "UKM",
    "hmj": "HMJ",
    "hima": "HIMA",
    "siakad": "SIAKAD",
}

_DAYS_ID = {
    "senin", "selasa", "rabu", "kamis", "jumat", "jum'at", "sabtu", "minggu", "ahad",
}

_MONTHS_ID = (
    "januari", "februari", "maret", "april", "mei", "juni",
    "juli", "agustus", "september", "oktober", "november", "desember",
)

_CITIES_ID = {
    "semarang", "jakarta", "surabaya", "bandung", "yogyakarta", "jogjakarta",
    "medan", "makassar", "malang", "solo", "surakarta", "bogor", "depok",
    "bekasi", "tangerang", "palembang", "denpasar", "padang", "pekanbaru",
    "banjarmasin", "pontianak", "manado", "lampung", "indonesia",
}


def roman_from_arabic_bab(bab_label: str) -> str:
    """Convert 'bab 1' / 'BAB 2' / 'bab iii' -> 'BAB I' / 'BAB II' / 'BAB III'."""
    parts = bab_label.strip().split()
    if len(parts) < 2:
        return bab_label.upper()
    num_str = parts[1].strip()
    if not num_str.isdigit():
        return f"BAB {num_str.upper()}"
    n = int(num_str)
    romans = [
        (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")
    ]
    out = ""
    for val, sym in romans:
        while n >= val:
            out += sym
            n -= val
    return f"BAB {out or num_str}"


def smart_title_case_id(text: str) -> str:
    """Format Indonesian headings (e.g. '1.1 latar belakang' -> '1.1 Latar Belakang')."""
    s = text.strip()
    if not s:
        return s
    prefix = ""
    rest = s
    m_num = re.match(r"^(\d+(?:\.\d+)*\.?\s+|[A-Z]\.\s+)(.+)$", s)
    if m_num:
        prefix = m_num.group(1)
        rest = m_num.group(2)

    words = rest.split()
    out_words = []
    for i, w in enumerate(words):
        lw = w.lower()
        clean_lw = lw.strip(".,:;()\"'")
        if clean_lw in _ACRONYMS_ID:
            out_words.append(re.sub(re.escape(clean_lw), _ACRONYMS_ID[clean_lw], lw, flags=re.I))
        elif i > 0 and clean_lw in _STOPWORDS_ID:
            out_words.append(lw)
        else:
            out_words.append(w[:1].upper() + w[1:].lower() if w else w)
    return prefix + " ".join(out_words)


def smart_sentence_case_id(text: str) -> str:
    """If a paragraph is completely lowercase, capitalize sentence starts, acronyms, and proper nouns."""
    s = text.strip()
    alpha_chars = [c for c in s if c.isalpha()]
    if len(alpha_chars) < 12 or s != s.lower():
        return s

    # Capitalize start of string and after sentence-ending punctuation
    chars = list(s)
    cap_next = True
    for idx, ch in enumerate(chars):
        if cap_next and ch.isalpha():
            chars[idx] = ch.upper()
            cap_next = False
        elif ch in ".!?\n":
            cap_next = True
        elif not ch.isspace() and ch not in "\"'(":
            cap_next = False
    res = "".join(chars)

    # Proper nouns & religious phrases
    res = re.sub(r"\btuhan yang maha esa\b", "Tuhan Yang Maha Esa", res, flags=re.I)
    res = re.sub(r"\ballah swt\b", "Allah SWT", res, flags=re.I)
    for m in _MONTHS_ID:
        res = re.sub(rf"\b{m}\b", m.capitalize(), res, flags=re.I)
    for c in _CITIES_ID:
        res = re.sub(rf"\b{c}\b", c.capitalize(), res, flags=re.I)
    for acr_k, acr_v in _ACRONYMS_ID.items():
        if len(acr_k) >= 2 and acr_k not in {"di", "ke"}:
            res = re.sub(rf"\b{re.escape(acr_k)}\b", acr_v, res, flags=re.I)
    res = re.sub(r"\bbapak/ibu\b", "Bapak/Ibu", res, flags=re.I)
    res = re.sub(r"\b(ibu|bapak|dr\.?|prof\.?)\s+([a-z])", lambda m: f"{m.group(1).capitalize()} {m.group(2).upper()}", res)
    return res


def split_inline_kata_pengantar_signature(text: str) -> Tuple[str, Optional[str]]:
    """
    Detect trailing signature attached to the end of Kata Pengantar paragraph:
    e.g. '...kritik dan saran sangat diharapkan. semarang, 21 november 2026. penulis.'
    Returns (cleaned_body, 'Semarang, 21 November 2026\n\n\nPenulis') or (text, None).
    """
    months_pat = "|".join(_MONTHS_ID)
    m = re.match(
        rf"^(.*?[.!?])\s+([A-Za-z\s]{{3,25}},\s*(?:\d{{1,2}}\s+)?(?:{months_pat})\s+20\d{{2}})[.\s]*(penulis|penyusun|tim penyusun|hormat saya|hormat kami)?[.]?$",
        text.strip(),
        re.IGNORECASE,
    )
    if not m:
        return text, None
    body_part = m.group(1).strip()
    date_part = smart_title_case_id(m.group(2).strip())
    signer_part = smart_title_case_id((m.group(3) or "Penulis").strip())
    return body_part, f"{date_part}\n\n\n{signer_part}"


def extract_metadata_from_prose(raw_text: str) -> Dict[str, str]:
    """
    Zero-markup fallback extractor: extracts title, course, lecturer, city, year,
    and institution from natural Indonesian prose (like Kata Pengantar) when the user
    did not write an explicit cover block at the top.
    """
    meta: Dict[str, str] = {}
    flat = re.sub(r"\s+", " ", raw_text[:4500]).strip()

    # 1. Title from "... berjudul ..." or "... dengan judul ..."
    m_title = re.search(
        r"(?:makalah|skripsi|laporan(?:\s+magang)?|proposal|karya\s+tulis)\s+(?:yang\s+)?(?:berjudul|dengan\s+judul)\s+[\"“]?(.+?)[\"”]?(?=\s+(?:ini|tersebut|dapat|telah|disusun|adalah)\b|[.!?\n]|$)",
        flat,
        re.IGNORECASE,
    )
    if not m_title:
        m_title = re.search(r"(?:yang\s+)?(?:berjudul|dengan\s+judul)\s+[\"“]([^\"”]{8,160})[\"”]", flat, re.IGNORECASE)
    if m_title:
        meta["title"] = smart_title_case_id(m_title.group(1).strip())

    # 2. Course from "... tugas mata kuliah ..."
    m_course = re.search(
        r"tugas\s+mata\s+kuliah\s+([A-Za-z0-9\s,&\-]{3,60}?)(?=[.!?\n]|\s+(?:serta|pada|di|yang|dan\s+untuk|kepada)\b|$)",
        flat,
        re.IGNORECASE,
    )
    if m_course:
        meta["course"] = smart_title_case_id(m_course.group(1).strip())

    # 3. Lecturer from "... kepada <nama> selaku dosen pengampu/pembimbing ..."
    m_lec = re.search(
        r"(?:kepada\s+)?((?:ibu|bapak|bpk\.?|dr\.?|prof\.?)\s+[A-Za-z.,'\s]{3,45}?)\s+(?:selaku|sebagai)\s+dosen\s+(?:pengampu|pembimbing)",
        flat,
        re.IGNORECASE,
    )
    if not m_lec:
        m_lec = re.search(
            r"dosen\s+(?:pengampu|pembimbing)\s*[:\-]\s*([A-Za-z0-9.,'\s]{3,55}?)(?=\s+(?:serta|yang|dan)\b|[;\n]|$)",
            flat,
            re.IGNORECASE,
        )
    if m_lec:
        lec_cand = smart_title_case_id(m_lec.group(1).strip().rstrip(",."))
        if not any(bad in lec_cand.lower() for bad in ("lapangan", "instansi", "pembimbing")):
            meta["lecturer"] = lec_cand

    # 4. City & Year from "<Kota>, 21 November 2026" (excluding weekday names like "Senin, 30 November 2026")
    months_pat = "|".join(_MONTHS_ID)
    for m_city in re.finditer(
        rf"\b([A-Za-z]{{3,20}}),\s*(?:\d{{1,2}}\s+)?(?:{months_pat})\s+(20\d{{2}})\b",
        flat,
        re.IGNORECASE,
    ):
        cand_city = m_city.group(1).strip()
        if cand_city.lower() not in _DAYS_ID:
            meta["city"] = cand_city.capitalize()
            meta["year"] = m_city.group(2).strip()
            break

    # 4b. Extract applicant/author from "Nama : ..." and subject from "Perihal : ..." in letters
    m_nama_kv = re.search(r"(?:^|\n)\s*nama\s*:\s*([A-Za-z.,'\s]{3,45}?)(?=\n|$)", raw_text[:2500], re.IGNORECASE)
    if m_nama_kv and not meta.get("author"):
        meta["author"] = smart_title_case_id(m_nama_kv.group(1).strip())
    m_perihal_kv = re.search(r"(?:^|\n)\s*(?:perihal|hal)\s*:\s*([^\n]{3,80}?)(?=\n|$)", raw_text[:2500], re.IGNORECASE)
    if m_perihal_kv and not meta.get("title"):
        meta["title"] = smart_title_case_id(m_perihal_kv.group(1).strip())

    # 5. Institution if mentioned
    m_inst = re.search(
        r"\b((?:universitas|institut|politeknik|sekolah\s+tinggi)\s+[A-Za-z\s]{3,38}?)(?=[.,!?\n]|\s+(?:dengan|yang|pada|di)\b|$)",
        flat,
        re.IGNORECASE,
    )
    if m_inst:
        meta["institution"] = m_inst.group(1).strip().upper()

    return meta


def strip_md_inline(text: str) -> str:
    """Remove markdown bold/italic markers for clean plain-text inspection."""
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    s = re.sub(r"__(.+?)__", r"\1", s)
    s = re.sub(r"\*(.+?)\*", r"\1", s)
    s = re.sub(r"`(.+?)`", r"\1", s)
    return s.strip()


def add_markdown_runs(paragraph, text: str):
    """Parse **bold** and *italic* inline tokens into proper Word runs."""
    pattern = re.compile(r"(\*\*.*?\*\*|__.*?__|\*[^\*]+?\*|`[^`]+?`)")
    tokens = pattern.split(text)
    for token in tokens:
        if not token:
            continue
        if (token.startswith("**") and token.endswith("**")) or (
            token.startswith("__") and token.endswith("__")
        ):
            inner = token[2:-2]
            if inner:
                run = paragraph.add_run(inner)
                run.bold = True
        elif token.startswith("*") and token.endswith("*") and len(token) > 2:
            inner = token[1:-1]
            run = paragraph.add_run(inner)
            run.italic = True
        elif token.startswith("`") and token.endswith("`") and len(token) > 2:
            inner = token[1:-1]
            run = paragraph.add_run(inner)
        else:
            paragraph.add_run(token)


def extract_image_data_uri_from_paragraph(p) -> Optional[str]:
    """Extract embedded image bytes from a paragraph's OOXML drawing/pict as a PNG data URI."""
    try:
        rids = []
        rids.extend(
            p._p.xpath('.//*[local-name()="blip"]/@*[local-name()="embed"]')
        )
        if not rids:
            rids.extend(
                p._p.xpath('.//*[local-name()="imagedata"]/@*[local-name()="id"]')
            )

        for rid in rids:
            part = p.part.related_parts.get(rid)
            if part is None and rid in p.part.rels:
                part = p.part.rels[rid].target_part
            if part is not None and getattr(part, "blob", None):
                blob = part.blob
                try:
                    img = Image.open(io.BytesIO(blob)).convert("RGBA")
                    buf = io.BytesIO()
                    img.save(buf, format="PNG")
                    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                    return f"data:image/png;base64,{b64}"
                except Exception:
                    ct = getattr(part, "content_type", "image/png") or "image/png"
                    b64 = base64.b64encode(blob).decode("ascii")
                    return f"data:{ct};base64,{b64}"
    except Exception:
        return None
    return None


def _clean_dots(text: str) -> str:
    return re.sub(r"\.{3,}", "", text).strip()


def _parse_cover_lines(lines_with_idx: List[Tuple[int, str]]) -> Dict[str, str]:
    """Heuristic parser for academic/proposal cover lines."""
    meta: Dict[str, str] = {
        "doc_label": "",
        "title": "",
        "subtitle": "",
        "course": "",
        "lecturer": "",
        "author": "",
        "nim": "",
        "study_program": "",
        "department": "",
        "faculty": "",
        "institution": "",
        "city": "",
        "year": "",
    }

    expect_next: Optional[str] = None
    title_candidates: List[str] = []
    author_lines: List[str] = []
    seen_title_phase_end = False

    for _, raw_line in lines_with_idx:
        s = raw_line.strip()
        if not s or PAGE_BREAK_RE.match(s):
            continue
        plain = strip_md_inline(s.lstrip("#").strip())
        plain_no_dots = _clean_dots(plain).strip(" :-\t")
        if not plain_no_dots:
            continue
        upper = plain_no_dots.upper()

        if upper in COVER_DOC_LABELS and not meta["doc_label"]:
            meta["doc_label"] = upper
            continue

        # Also split when a cover label is glued in front of the title on line 1 (e.g. "PROPOSAL KEGIATAN SEMINAR NASIONAL 2026")
        matched_glued_label = False
        for lbl in sorted(COVER_DOC_LABELS, key=len, reverse=True):
            if upper.startswith(lbl + " ") and len(upper) > len(lbl) + 5:
                if not meta["doc_label"]:
                    meta["doc_label"] = lbl
                rem = plain_no_dots[len(lbl):].strip(" :-\t")
                m_tail_yr = re.search(r"\s+(20\d{2})$", rem)
                if m_tail_yr and not meta["year"]:
                    meta["year"] = m_tail_yr.group(1)
                    rem = rem[:m_tail_yr.start()].strip()
                if rem:
                    title_candidates.append(rem)
                matched_glued_label = True
                break
        if matched_glued_label:
            continue

        if expect_next == "course":
            if not any(k in upper for k in ("DOSEN", "DISUSUN", "OLEH")):
                meta["course"] = plain_no_dots
                expect_next = None
                continue
            expect_next = None
        elif expect_next == "lecturer":
            if not any(k in upper for k in ("DISUSUN", "OLEH", "NAMA", "PROGRAM STUDI", "FAKULTAS")):
                meta["lecturer"] = plain_no_dots
                expect_next = None
                continue
            expect_next = None
        elif expect_next == "author":
            if any(
                k in upper
                for k in (
                    "PROGRAM STUDI",
                    "PRODI",
                    "JURUSAN",
                    "DEPARTEMEN",
                    "FAKULTAS",
                    "UNIVERSITAS",
                    "INSTITUT",
                    "POLITEKNIK",
                    "SEKOLAH",
                )
            ):
                expect_next = None
            elif upper.startswith("NAMA"):
                val = _clean_dots(plain.split(":", 1)[1]).strip() if ":" in plain else ""
                if val:
                    meta["author"] = val
                continue
            elif upper.startswith("NIM") or upper.startswith("NPM"):
                val = _clean_dots(plain.split(":", 1)[1]).strip() if ":" in plain else ""
                if val:
                    meta["nim"] = val
                continue
            else:
                m_paren = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", plain_no_dots)
                if m_paren:
                    if not meta["author"]:
                        meta["author"] = m_paren.group(1).strip()
                        meta["nim"] = m_paren.group(2).strip()
                    else:
                        author_lines.append(plain_no_dots)
                else:
                    author_lines.append(plain_no_dots)
                continue

        m_mk_inline = re.search(r"mata\s+kuliah\s*[:\-]?\s*(.+)$", plain, re.IGNORECASE)
        if m_mk_inline:
            seen_title_phase_end = True
            course_val = _clean_dots(m_mk_inline.group(1)).strip(" :-\t")
            if course_val:
                meta["course"] = course_val
            else:
                expect_next = "course"
            continue

        if any(p in upper for p in ("DISUSUN GUNA MEMENUHI", "DIAJUKAN UNTUK MEMENUHI", "TUGAS MATA KULIAH")):
            seen_title_phase_end = True
            if "MATA KULIAH" in upper:
                expect_next = "course"
            continue

        if upper.startswith("DOSEN PENGAMPU") or upper.startswith("DOSEN PEMBIMBING") or upper.startswith("PEMBIMBING"):
            seen_title_phase_end = True
            after = _clean_dots(plain.split(":", 1)[1]).strip() if ":" in plain else ""
            if after:
                meta["lecturer"] = after
            else:
                expect_next = "lecturer"
            continue

        if upper.startswith("DISUSUN OLEH") or upper.startswith("OLEH"):
            seen_title_phase_end = True
            after = _clean_dots(plain.split(":", 1)[1]).strip() if ":" in plain else ""
            if after:
                m_paren = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", after)
                if m_paren:
                    meta["author"] = m_paren.group(1).strip()
                    meta["nim"] = m_paren.group(2).strip()
                else:
                    meta["author"] = after
            else:
                expect_next = "author"
            continue

        if upper.startswith("NAMA"):
            seen_title_phase_end = True
            after = _clean_dots(plain.split(":", 1)[1]).strip() if ":" in plain else ""
            if after:
                meta["author"] = after
            continue

        if upper.startswith("NIM") or upper.startswith("NPM") or upper.startswith("NIS"):
            seen_title_phase_end = True
            after = _clean_dots(plain.split(":", 1)[1]).strip() if ":" in plain else ""
            if after:
                meta["nim"] = after
            continue

        if upper.startswith("PROGRAM STUDI") or upper.startswith("PRODI"):
            seen_title_phase_end = True
            after = _clean_dots(plain.split(":", 1)[1]).strip() if ":" in plain else plain_no_dots
            if after and after.upper() not in {"PROGRAM STUDI", "PRODI"}:
                meta["study_program"] = after
            continue

        if upper.startswith("JURUSAN") or upper.startswith("DEPARTEMEN") or any(
            upper.startswith(org_kw)
            for org_kw in (
                "HIMPUNAN MAHASISWA",
                "HIMA ",
                "HMJ ",
                "BEM ",
                "BADAN EKSEKUTIF MAHASISWA",
                "UKM ",
                "PANITIA PELAKSANA",
            )
        ):
            seen_title_phase_end = True
            after = _clean_dots(plain.split(":", 1)[1]).strip() if ":" in plain else plain_no_dots
            if after and after.upper() not in {"JURUSAN", "DEPARTEMEN"}:
                meta["department"] = after
                if not meta["author"] and any(
                    upper.startswith(org_kw)
                    for org_kw in ("HIMPUNAN", "HIMA", "HMJ", "BEM", "BADAN EKSEKUTIF", "UKM", "PANITIA")
                ):
                    meta["author"] = after
            continue

        if upper.startswith("FAKULTAS"):
            seen_title_phase_end = True
            if len(plain_no_dots) > len("FAKULTAS"):
                meta["faculty"] = plain_no_dots
            continue

        if any(
            upper.startswith(inst)
            for inst in (
                "UNIVERSITAS",
                "INSTITUT",
                "POLITEKNIK",
                "SEKOLAH TINGGI",
                "SMA",
                "SMK",
                "SMP",
                "MADRASAH",
            )
        ):
            seen_title_phase_end = True
            if len(plain_no_dots) > 4:
                meta["institution"] = plain_no_dots
            continue

        if re.match(r"^20\d{2}$", plain_no_dots):
            meta["year"] = plain_no_dots
            continue

        m_direct_paren = re.match(r"^([A-Za-z\s.,']{3,50})\s*\(([A-Za-z0-9.\-/]{4,24})\)\s*$", plain_no_dots)
        if m_direct_paren and seen_title_phase_end:
            if not meta["author"]:
                meta["author"] = m_direct_paren.group(1).strip()
                meta["nim"] = m_direct_paren.group(2).strip()
            else:
                author_lines.append(plain_no_dots)
            continue

        if not seen_title_phase_end and upper not in COVER_DOC_LABELS:
            title_candidates.append(plain_no_dots)

    if author_lines and not meta["author"]:
        meta["author"] = ", ".join(author_lines)
    elif author_lines and meta["author"]:
        meta["author"] = f"{meta['author']}, " + ", ".join(author_lines)

    if title_candidates:
        meta["title"] = " ".join(title_candidates)

    return meta


def normalize_raw_cv_text(raw_text: str) -> str:
    """
    Ensure raw pasted CV text (even if flattened onto few lines or lacking markdown # markers)
    splits cleanly around CV section headings and contact lines.
    """
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return text

    sorted_headers = sorted(CV_SECTION_HEADERS, key=len, reverse=True)
    header_pattern = "|".join(re.escape(h) for h in sorted_headers)

    text = re.sub(
        rf"(?<!\n)\s+(#+\s*)?({header_pattern})\b",
        r"\n\1\2",
        text,
    )
    text = re.sub(
        rf"(?m)^(#+\s*)?({header_pattern})\s+(?=[A-Z0-9•\-\*])",
        r"\1\2\n",
        text,
    )

    lines = text.splitlines()
    if lines:
        first_line = lines[0].strip()
        m_contact_split = re.match(
            r"^([A-Z][A-Z\s\.']{4,45}?)\s+([A-Z][a-z]+,\s+[A-Za-z\s,]+?)\s+((?:\+?62|08)[\d\s\-]{7,}.*|\S+@\S+.*)$",
            first_line,
        )
        if m_contact_split:
            lines = [
                m_contact_split.group(1).strip(),
                m_contact_split.group(2).strip(),
                m_contact_split.group(3).strip(),
            ] + lines[1:]
        else:
            m_name_phone = re.match(
                r"^([A-Z][A-Z\s\.']{4,45}?)\s+((?:\+?62|08)[\d\s\-]{7,}.*|\S+@\S+.*)$",
                first_line,
            )
            if m_name_phone:
                lines = [
                    m_name_phone.group(1).strip(),
                    m_name_phone.group(2).strip(),
                ] + lines[1:]
            else:
                m_name_loc = re.match(
                    r"^([A-Z][A-Z\s\.']{4,45}?)\s+([A-Z][a-z]+,\s+[A-Z][a-zA-Z\s,]+)$",
                    first_line,
                )
                if m_name_loc:
                    lines = [
                        m_name_loc.group(1).strip(),
                        m_name_loc.group(2).strip(),
                    ] + lines[1:]

    return "\n".join(lines)


def extract_metadata_from_markdown(
    raw_text: str, preset_id: str = "makalah"
) -> Tuple[Dict[str, str], str]:
    """
    Extract cover metadata ONLY when preset_id is an academic/proposal preset,
    falling back to prose extraction (e.g. from Kata Pengantar) when no explicit cover block exists.
    """
    if preset_id not in ACADEMIC_COVER_PRESETS:
        first_non_empty = ""
        for line in raw_text.splitlines():
            s = strip_md_inline(line.lstrip("#").strip())
            if s:
                first_non_empty = s[:70]
                break
        return {"title": first_non_empty}, raw_text

    lines = raw_text.splitlines()
    cover_end_idx = 0
    found_first_section = False
    pre_section_lines: List[Tuple[int, str]] = []

    for idx, line in enumerate(lines):
        cleaned = strip_md_inline(line.lstrip("#").strip())
        upper = cleaned.upper()
        if (
            upper in ACADEMIC_SECTION_START_TITLES
            or (preset_id == "proposal" and upper.rstrip(":") in PROPOSAL_SECTION_HEADERS)
            or ROMAN_CHAPTER_RE.match(cleaned)
            or upper.startswith("BAB I ")
            or upper.startswith("BAB 1 ")
            or upper == "BAB I"
            or upper == "BAB 1"
        ):
            cover_end_idx = idx
            found_first_section = True
            break
        if idx < 45:
            for split_part in split_glued_cover_text(line) or [line]:
                pre_section_lines.append((idx, split_part))

    prose_meta = extract_metadata_from_prose(raw_text)

    if not found_first_section:
        meta = _parse_cover_lines(pre_section_lines[:10])
        for k, v in prose_meta.items():
            if v and not meta.get(k):
                meta[k] = v
        return meta, raw_text

    combined_upper = " ".join(strip_md_inline(l.lstrip("#").strip()).upper() for _, l in pre_section_lines if l.strip())
    cover_keywords = (
        "MAKALAH",
        "SKRIPSI",
        "PROPOSAL",
        "LAPORAN",
        "DISUSUN",
        "DIAJUKAN",
        "DOSEN",
        "OLEH",
        "NIM",
        "NPM",
        "PROGRAM STUDI",
        "FAKULTAS",
        "UNIVERSITAS",
    )
    has_cover_indicators = any(k in combined_upper for k in cover_keywords)
    long_prose_lines = sum(1 for _, l in pre_section_lines if len(l.split()) > 26)
    if not has_cover_indicators or long_prose_lines >= 2:
        meta = _parse_cover_lines(pre_section_lines[:8])
        for k, v in prose_meta.items():
            if v and not meta.get(k):
                meta[k] = v
        return meta, raw_text

    meta = _parse_cover_lines(pre_section_lines)
    for k, v in prose_meta.items():
        if v and not meta.get(k):
            meta[k] = v
    remaining_text = "\n".join(lines[cover_end_idx:])
    return meta, remaining_text


def extract_cover_and_metadata_from_docx(
    doc: Document, preset_id: str = "makalah"
) -> Tuple[Dict[str, str], int]:
    """
    Inspect the beginning of an uploaded .docx file to detect whether it contains an existing
    academic/proposal cover block, extract metadata + any embedded logo, and return (meta, cover_end_raw_idx).
    """
    if preset_id not in ACADEMIC_COVER_PRESETS:
        first_line = ""
        for kind, obj, _ in iter_document_blocks(doc):
            if kind == "paragraph":
                t = extract_paragraph_text_full(obj).strip()
                if t:
                    first_line = t[:70]
                    break
        return {"title": first_line}, 0

    pre_lines: List[Tuple[int, str]] = []
    cover_end_raw_idx = 0
    found_first_section = False
    first_page_break_idx: Optional[int] = None
    extracted_logo_uri: Optional[str] = None
    prose_parts: List[str] = []
    last_p_idx = -1
    seen_cover_year = False

    for kind, obj, raw_idx in iter_document_blocks(doc):
        if kind != "paragraph":
            if len(pre_lines) > 0 and last_p_idx >= 0:
                cover_end_raw_idx = last_p_idx + 1
                found_first_section = True
                break
            continue

        p = obj
        last_p_idx = raw_idx
        txt = extract_paragraph_text_full(p).strip()
        if txt and len(prose_parts) < 40:
            prose_parts.append(txt)

        cleaned = strip_md_inline(txt)
        upper = cleaned.upper()

        if not extracted_logo_uri and ("w:drawing" in p._p.xml or "w:pict" in p._p.xml):
            extracted_logo_uri = extract_image_data_uri_from_paragraph(p)

        has_pb = "w:br" in p._p.xml and 'w:type="page"' in p._p.xml
        if has_pb and first_page_break_idx is None and len(pre_lines) > 0:
            first_page_break_idx = raw_idx + 1

        if (
            upper in ACADEMIC_SECTION_START_TITLES
            or (preset_id == "proposal" and upper.rstrip(":") in PROPOSAL_SECTION_HEADERS)
            or ROMAN_CHAPTER_RE.match(cleaned)
            or upper.startswith("BAB I ")
            or upper.startswith("BAB 1 ")
            or upper == "BAB I"
            or upper == "BAB 1"
        ):
            cover_end_raw_idx = raw_idx
            found_first_section = True
            break

        # If cover year (e.g. 2026) already appeared and we hit body prose/hyperlink/textbox, stop cover right before it
        if (
            seen_cover_year
            and cleaned
            and not re.match(r"^20\d{2}$", cleaned)
            and not any(
                k in upper
                for k in (
                    "PROGRAM STUDI",
                    "PRODI",
                    "JURUSAN",
                    "DEPARTEMEN",
                    "FAKULTAS",
                    "UNIVERSITAS",
                    "INSTITUT",
                    "POLITEKNIK",
                    "SEKOLAH TINGGI",
                    "SEMARANG",
                    "JAKARTA",
                    "BANDUNG",
                    "SURABAYA",
                    "YOGYAKARTA",
                )
            )
            and (
                cleaned.endswith(".")
                or len(cleaned.split()) > 10
                or "w:hyperlink" in p._p.xml
                or "w:txbxContent" in p._p.xml
            )
        ):
            cover_end_raw_idx = raw_idx
            found_first_section = True
            break

        if raw_idx >= 35:
            break

        if cleaned:
            if re.search(r"\b20\d{2}\b", cleaned):
                seen_cover_year = True
            for sub_line in cleaned.splitlines():
                for glued_part in split_glued_cover_text(sub_line):
                    if glued_part:
                        pre_lines.append((raw_idx, glued_part))

    if not found_first_section and first_page_break_idx is not None:
        cover_end_raw_idx = first_page_break_idx
        found_first_section = True

    prose_sample = "\n".join(prose_parts)
    prose_meta = extract_metadata_from_prose(prose_sample)

    if not found_first_section or not pre_lines:
        meta = _parse_cover_lines(pre_lines[:10])
        for k, v in prose_meta.items():
            if v and not meta.get(k):
                meta[k] = v
        if extracted_logo_uri:
            meta["extracted_logo_base64"] = extracted_logo_uri
        return meta, 0

    combined_upper = " ".join(line.upper() for _, line in pre_lines)
    cover_keywords = (
        "MAKALAH",
        "SKRIPSI",
        "PROPOSAL",
        "LAPORAN",
        "DISUSUN",
        "DIAJUKAN",
        "DOSEN",
        "OLEH",
        "NIM",
        "NPM",
        "PROGRAM STUDI",
        "PRODI",
        "FAKULTAS",
        "UNIVERSITAS",
        "INSTITUT",
        "POLITEKNIK",
        "SEKOLAH",
    )
    has_cover_indicators = any(k in combined_upper for k in cover_keywords)
    long_prose_lines = sum(1 for _, line in pre_lines if len(line.split()) > 26)

    if not has_cover_indicators or long_prose_lines >= 2:
        meta = _parse_cover_lines(pre_lines[:6])
        for k, v in prose_meta.items():
            if v and not meta.get(k):
                meta[k] = v
        if extracted_logo_uri:
            meta["extracted_logo_base64"] = extracted_logo_uri
        return meta, 0

    meta = _parse_cover_lines(pre_lines)
    for k, v in prose_meta.items():
        if v and not meta.get(k):
            meta[k] = v
    if extracted_logo_uri:
        meta["extracted_logo_base64"] = extracted_logo_uri
    return meta, cover_end_raw_idx


def _is_cv_contact_line(text: str) -> bool:
    low = text.lower()
    return (
        "@" in text
        or "|" in text
        or "github.com" in low
        or "linkedin.com" in low
        or bool(re.search(r"(\+62|08)\d{7,}", text.replace(" ", "").replace("-", "")))
    )


def markdown_to_docx(
    raw_text: str, strip_raw_cover: bool = True, preset_id: str = "makalah"
) -> Tuple[Document, Dict[str, str]]:
    """
    Convert free-form raw text or Markdown into a structured python-docx Document,
    without requiring any special symbols (#, ##, ---) from the user.
    """
    working_text = normalize_raw_cv_text(raw_text) if preset_id == "cv_ats" else raw_text
    extracted_meta, body_text = extract_metadata_from_markdown(working_text, preset_id=preset_id)
    should_strip = strip_raw_cover and (preset_id in ACADEMIC_COVER_PRESETS) and bool(body_text.strip())
    source_text = body_text if should_strip else working_text

    doc = Document()
    lines = source_text.splitlines()
    i = 0
    n = len(lines)
    non_empty_seen = 0
    seen_cv_first_section = False

    while i < n:
        line = lines[i].rstrip()
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        non_empty_seen += 1

        # 1. Optional page break '---'
        if PAGE_BREAK_RE.match(stripped):
            doc.add_page_break()
            i += 1
            continue

        # 2. Markdown table detection
        if stripped.startswith("|") and stripped.endswith("|") and "|" in stripped[1:-1]:
            table_rows: List[List[str]] = []
            while i < n:
                tline = lines[i].strip()
                if not (tline.startswith("|") and tline.endswith("|")):
                    break
                cells = [c.strip() for c in tline.strip("|").split("|")]
                if all(re.match(r"^:?\-{2,}:?$", c) for c in cells if c):
                    i += 1
                    continue
                table_rows.append(cells)
                i += 1
            if table_rows:
                cols = max(len(r) for r in table_rows)
                tbl = doc.add_table(rows=len(table_rows), cols=cols)
                tbl.style = "Table Grid"
                for r_idx, row_data in enumerate(table_rows):
                    for c_idx, cell_val in enumerate(row_data):
                        if c_idx < cols:
                            cell_p = tbl.cell(r_idx, c_idx).paragraphs[0]
                            cell_p.text = ""
                            add_markdown_runs(cell_p, cell_val)
            continue

        plain_candidate = strip_md_inline(stripped.lstrip("#").strip())
        plain_upper = plain_candidate.upper().rstrip(":")

        # 3. Manual TOC lines (e.g. "halaman judul ... i" or "bab 1 pendahuluan ... 1")
        if re.match(r"^.+?\.{2,}\s*(?:[ivxlcdm]+|\d+)\s*$", plain_candidate, re.IGNORECASE):
            p = doc.add_paragraph(style="Normal")
            p.add_run(plain_candidate)
            i += 1
            continue

        # 4. CV-specific automatic header & section detection
        if preset_id == "cv_ats":
            if plain_upper in CV_SECTION_HEADERS:
                seen_cv_first_section = True
                p = doc.add_paragraph(style="Heading 1")
                p.add_run(plain_upper)
                i += 1
                continue

            if not seen_cv_first_section and non_empty_seen <= 4:
                p = doc.add_paragraph(style="Normal")
                add_markdown_runs(p, stripped.lstrip("#").strip())
                i += 1
                continue

            if (
                not stripped.startswith(("-", "*", "•"))
                and len(plain_candidate) < 95
                and not plain_candidate.endswith(".")
                and (
                    "|" in plain_candidate
                    or "—" in plain_candidate
                    or "–" in plain_candidate
                    or re.search(r"\b(19|20)\d{2}\b", plain_candidate)
                )
            ):
                p = doc.add_paragraph(style="Heading 2")
                add_markdown_runs(p, stripped.lstrip("#").strip())
                i += 1
                continue

        # 5. Journal / Proposal / Work Report section headers
        if preset_id == "jurnal_artikel" and plain_upper in JOURNAL_SECTION_HEADERS:
            p = doc.add_paragraph(style="Heading 1")
            p.add_run(plain_upper)
            i += 1
            continue

        if preset_id == "proposal" and plain_upper in PROPOSAL_SECTION_HEADERS:
            p = doc.add_paragraph(style="Heading 1")
            p.add_run(plain_upper)
            i += 1
            continue

        if preset_id == "laporan_kerja":
            if non_empty_seen == 1 and plain_upper not in WORK_REPORT_SECTION_HEADERS and len(plain_candidate) < 110:
                p = doc.add_paragraph(style="Heading 1")
                p.add_run(plain_upper)
                i += 1
                continue
            if plain_upper in WORK_REPORT_SECTION_HEADERS:
                p = doc.add_paragraph(style="Heading 2")
                p.add_run(smart_title_case_id(plain_candidate))
                i += 1
                continue

        # 6. Explicit # / ## / ### (still supported seamlessly if user pastes AI output)
        if stripped.startswith("# ") and not stripped.startswith("## "):
            h1_text = strip_md_inline(stripped[2:].strip())
            m_b = ROMAN_CHAPTER_RE.match(h1_text)
            if m_b and (i + 1) < n:
                next_s = lines[i + 1].strip()
                if next_s.startswith("# ") and not next_s.startswith("## "):
                    next_h1 = strip_md_inline(next_s[2:].strip())
                    if not ROMAN_CHAPTER_RE.match(next_h1):
                        p = doc.add_paragraph(style="Heading 1")
                        p.add_run(f"{roman_from_arabic_bab(m_b.group(1))}\n{next_h1.upper()}")
                        i += 2
                        continue
            p = doc.add_paragraph(style="Heading 1")
            add_markdown_runs(p, h1_text)
            i += 1
            continue

        if stripped.startswith("## ") and not stripped.startswith("### "):
            h2_text = stripped[3:].strip()
            p = doc.add_paragraph(style="Heading 2")
            add_markdown_runs(p, h2_text)
            i += 1
            continue

        if stripped.startswith("### "):
            h3_text = stripped.lstrip("#").strip()
            p = doc.add_paragraph(style="Heading 3")
            add_markdown_runs(p, h3_text)
            i += 1
            continue

        # 7. Zero-markup Heading 1 (KATA PENGANTAR, DAFTAR ISI, BAB 1 PENDAHULUAN, DAFTAR PUSTAKA, etc.)
        if plain_upper in SPECIAL_H1_TITLES and (preset_id in ACADEMIC_COVER_PRESETS or preset_id == "jurnal_artikel"):
            p = doc.add_paragraph(style="Heading 1")
            p.add_run(plain_upper)
            i += 1
            continue

        m_bab = ROMAN_CHAPTER_RE.match(plain_candidate)
        if m_bab and len(plain_candidate) < 85:
            bab_code = roman_from_arabic_bab(m_bab.group(1))
            bab_title = (m_bab.group(3) or "").strip()
            if not bab_title and (i + 1) < n:
                next_plain = strip_md_inline(lines[i + 1].strip().lstrip("#").strip())
                if next_plain and len(next_plain) < 70 and not SUBCHAPTER_RE.match(next_plain):
                    p = doc.add_paragraph(style="Heading 1")
                    p.add_run(f"{bab_code}\n{next_plain.upper()}")
                    i += 2
                    continue
            p = doc.add_paragraph(style="Heading 1")
            p.add_run(f"{bab_code}\n{bab_title.upper()}" if bab_title else bab_code)
            i += 1
            continue

        # 8. Zero-markup Heading 2 / 3 (e.g. "1.1 latar belakang", "2.2 metode forward chaining", "A. Tujuan")
        m_sub = SUBCHAPTER_RE.match(plain_candidate)
        if m_sub and len(plain_candidate) < 110 and not plain_candidate.endswith("."):
            num_part = m_sub.group(1)
            style_name = "Heading 3" if num_part.count(".") >= 2 else "Heading 2"
            p = doc.add_paragraph(style=style_name)
            add_markdown_runs(p, stripped)
            i += 1
            continue

        m_letter_sub = LETTER_SUBHEAD_RE.match(plain_candidate)
        if m_letter_sub and len(plain_candidate) < 85:
            p = doc.add_paragraph(style="Heading 2")
            add_markdown_runs(p, stripped)
            i += 1
            continue

        # 9. Bullet & Numbered lists
        m_bullet = BULLET_ITEM_RE.match(stripped)
        if m_bullet:
            p = doc.add_paragraph(style="List Bullet")
            add_markdown_runs(p, m_bullet.group(1))
            i += 1
            continue

        m_num = NUMBERED_ITEM_RE.match(stripped)
        if m_num:
            p = doc.add_paragraph(style="List Number")
            add_markdown_runs(p, f"{m_num.group(1)}. {m_num.group(2)}")
            i += 1
            continue

        m_alpha = ALPHA_ITEM_RE.match(stripped)
        if m_alpha:
            p = doc.add_paragraph(style="List Number")
            add_markdown_runs(p, f"{m_alpha.group(1)}. {m_alpha.group(2)}")
            i += 1
            continue

        # 10. Regular paragraph
        p = doc.add_paragraph(style="Normal")
        add_markdown_runs(p, stripped)
        i += 1

    return doc, extracted_meta
