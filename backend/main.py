import io
import json
import os
import re
import sys
import uuid
import zipfile
import time
import shutil
import subprocess
import tempfile
from typing import Dict, Any, Optional, List

# Ensure backend directory is always on sys.path regardless of where uvicorn/python is launched from
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if _THIS_DIR not in sys.path:
    sys.path.insert(0, _THIS_DIR)

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from docx import Document

from engine.presets import get_all_presets, get_preset, save_custom_preset
from engine.markdown_parser import (
    markdown_to_docx,
    extract_cover_and_metadata_from_docx,
    extract_metadata_from_prose,
    COVER_DOC_LABELS,
    ACADEMIC_COVER_PRESETS,
)
from engine.analyzer import analyze_docx
from engine.formatter import format_docx_document, apply_inline_edits_to_docx
from engine.ooxml_reader import iter_document_blocks, extract_paragraph_text_full

app = FastAPI(
    title="RapiDoc API - Smart Document Auto-Formatter",
    description="OOXML Document Analyzer, Zero-Markup Parser & Auto-Formatter Engine",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

SESSION_CACHE_DIR = os.path.join(_THIS_DIR, ".session_cache")
os.makedirs(SESSION_CACHE_DIR, exist_ok=True)

DOCUMENTS_STORE: Dict[str, Dict[str, Any]] = {}


def _save_session_record(doc_id: str, record: Dict[str, Any]) -> None:
    DOCUMENTS_STORE[doc_id] = record
    try:
        meta_path = os.path.join(SESSION_CACHE_DIR, f"{doc_id}.json")
        orig_path = os.path.join(SESSION_CACHE_DIR, f"{doc_id}_orig.docx")
        act_path = os.path.join(SESSION_CACHE_DIR, f"{doc_id}_act.docx")
        with open(orig_path, "wb") as f:
            f.write(record["original_bytes"])
        with open(act_path, "wb") as f:
            f.write(record["active_bytes"])
        serializable = {
            "id": record["id"],
            "filename": record["filename"],
            "size_bytes": record["size_bytes"],
            "created_at": record["created_at"],
            "source_type": record["source_type"],
            "raw_markdown": record.get("raw_markdown"),
            "status": record["status"],
            "preset_id": record["preset_id"],
            "extracted_meta": record.get("extracted_meta", {}),
            "initial_pages": record.get("initial_pages", 1),
            "edited_in_web": record.get("edited_in_web", False),
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, ensure_ascii=False)
    except Exception:
        pass


def _get_session_record(doc_id: str) -> Optional[Dict[str, Any]]:
    if doc_id in DOCUMENTS_STORE:
        return DOCUMENTS_STORE[doc_id]
    try:
        meta_path = os.path.join(SESSION_CACHE_DIR, f"{doc_id}.json")
        orig_path = os.path.join(SESSION_CACHE_DIR, f"{doc_id}_orig.docx")
        act_path = os.path.join(SESSION_CACHE_DIR, f"{doc_id}_act.docx")
        if os.path.exists(meta_path) and os.path.exists(orig_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                record = json.load(f)
            with open(orig_path, "rb") as f:
                record["original_bytes"] = f.read()
            if os.path.exists(act_path):
                with open(act_path, "rb") as f:
                    record["active_bytes"] = f.read()
            else:
                record["active_bytes"] = record["original_bytes"]
            DOCUMENTS_STORE[doc_id] = record
            return record
    except Exception:
        return None
    return None


def _slugify_filename(text: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]+', "", text).strip()
    cleaned = re.sub(r"\s+", "-", cleaned).upper()
    return cleaned or "DOKUMEN-RAPI"


class MarkdownInputRequest(BaseModel):
    text: str
    filename: Optional[str] = None
    preset_id: str = "makalah"
    custom_preset: Optional[Dict[str, Any]] = None


class FormatDocumentRequest(BaseModel):
    doc_id: str
    preset_id: str = "makalah"
    custom_preset: Optional[Dict[str, Any]] = None
    rules: Dict[str, bool]
    cover_data: Optional[Dict[str, Any]] = None
    raw_markdown: Optional[str] = None


class InlineParagraphUpdate(BaseModel):
    p_idx: int
    text: str = ""
    html: Optional[str] = None
    align: Optional[str] = None
    bold: Optional[bool] = None
    italic: Optional[bool] = None
    underline: Optional[bool] = None
    strike: Optional[bool] = None
    font_name: Optional[str] = None
    size_pt: Optional[float] = None
    color: Optional[str] = None
    delete: Optional[bool] = False
    image_base64: Optional[str] = None
    image_width_cm: Optional[float] = 6.0


class InlineTableUpdate(BaseModel):
    table_idx: int
    rows: List[List[str]]


class UpdateContentRequest(BaseModel):
    paragraph_updates: List[InlineParagraphUpdate] = []
    table_updates: List[InlineTableUpdate] = []
    preset_id: Optional[str] = None
    logo_update: Optional[Dict[str, Any]] = None
    cover_data: Optional[Dict[str, Any]] = None
    deleted_p_indices: Optional[List[int]] = []
    new_pages: Optional[List[Dict[str, Any]]] = []
    reordered_p_indices: Optional[List[int]] = None


class CustomTemplateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    short_name: Optional[str] = None
    category: str = "Custom"
    description: Optional[str] = None
    margin_top_cm: float = 4.0
    margin_bottom_cm: float = 3.0
    margin_left_cm: float = 4.0
    margin_right_cm: float = 3.0
    font_name: str = "Times New Roman"
    font_size_pt: float = 12.0
    line_spacing: float = 1.5
    first_line_indent_cm: float = 1.25
    alignment: str = "justify"
    h1_size_pt: float = 14.0
    h2_size_pt: float = 12.0
    chapter_page_break: bool = True
    use_roman_front_matter: bool = True
    include_toc: bool = True


def validate_docx_bytes(raw_bytes: bytes) -> Document:
    """Validate that the uploaded file is a genuine ZIP/OOXML .docx archive within 20 MB."""
    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Ukuran file melebihi batas maksimum 20 MB.")
    if not zipfile.is_zipfile(io.BytesIO(raw_bytes)):
        raise HTTPException(
            status_code=400,
            detail="Struktur ZIP tidak valid. Pastikan file adalah dokumen Microsoft Word (.docx) asli.",
        )
    try:
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
            namelist = zf.namelist()
            if "word/document.xml" not in namelist:
                raise HTTPException(
                    status_code=400,
                    detail="Struktur OOXML tidak lengkap (word/document.xml tidak ditemukan).",
                )
        return Document(io.BytesIO(raw_bytes))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal membaca dokumen DOCX: {str(exc)}")


@app.get("/api/health")
def health_check():
    soffice_path = shutil.which("soffice") or shutil.which("libreoffice")
    return {
        "status": "ok",
        "service": "RapiDoc Engine",
        "documents_in_memory": len(DOCUMENTS_STORE),
        "libreoffice_available": bool(soffice_path),
    }


@app.get("/api/presets")
def list_presets():
    return {"presets": get_all_presets()}


@app.post("/api/presets")
def create_or_update_preset(req: CustomTemplateRequest):
    saved = save_custom_preset(req.model_dump())
    return {"preset": saved, "presets": get_all_presets()}


@app.post("/api/documents/upload")
async def upload_docx(
    file: UploadFile = File(...),
    preset_id: str = Form("makalah"),
):
    fname_lower = (file.filename or "").lower()
    if fname_lower.endswith(".doc"):
        raise HTTPException(
            status_code=400,
            detail="Format .doc (Word lama) belum didukung langsung. Silakan Save As menjadi .docx di Word/Google Docs lalu unggah kembali.",
        )
    if not fname_lower.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Hanya menerima file dengan ekstensi .docx")

    try:
        raw_bytes = await file.read()
        doc = validate_docx_bytes(raw_bytes)
        preset = get_preset(preset_id)
        analysis = analyze_docx(doc, preset)

        extracted_meta, _ = extract_cover_and_metadata_from_docx(doc, preset_id=preset_id)
        deep_texts: List[str] = []
        for kind, obj, _ in iter_document_blocks(doc):
            if kind == "paragraph":
                t = extract_paragraph_text_full(obj).strip()
                if t:
                    deep_texts.append(t)
                if len(deep_texts) >= 40:
                    break

        if not extracted_meta.get("title") and deep_texts:
            prose_meta = extract_metadata_from_prose("\n".join(deep_texts))
            for k, v in prose_meta.items():
                if v and not extracted_meta.get(k):
                    extracted_meta[k] = v
        if not extracted_meta.get("title"):
            for t in deep_texts[:10]:
                if len(t) > 5 and t.upper() not in COVER_DOC_LABELS:
                    extracted_meta["title"] = t
                    break

        doc_id = str(uuid.uuid4())
        record = {
            "id": doc_id,
            "filename": file.filename,
            "size_bytes": len(raw_bytes),
            "created_at": int(time.time()),
            "source_type": "upload",
            "original_bytes": raw_bytes,
            "active_bytes": raw_bytes,
            "raw_markdown": None,
            "status": "Belum diproses",
            "preset_id": preset_id,
            "extracted_meta": extracted_meta,
            "initial_pages": analysis["stats"]["estimated_pages"],
        }
        _save_session_record(doc_id, record)

        return {
            "doc_id": doc_id,
            "filename": file.filename,
            "size_kb": max(1, round(len(raw_bytes) / 1024)),
            "status": "Belum diproses",
            "preset_id": preset_id,
            "extracted_meta": extracted_meta,
            "analysis": analysis,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gagal menganalisis dokumen DOCX: {exc}")


@app.post("/api/documents/from-text")
def create_from_markdown(req: MarkdownInputRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Teks tidak boleh kosong.")

    try:
        strip_cover = req.preset_id in ACADEMIC_COVER_PRESETS
        doc, extracted_meta = markdown_to_docx(
            req.text, strip_raw_cover=strip_cover, preset_id=req.preset_id
        )
        buf = io.BytesIO()
        doc.save(buf)
        raw_bytes = buf.getvalue()

        preset = get_preset(req.preset_id, req.custom_preset)
        analysis = analyze_docx(Document(io.BytesIO(raw_bytes)), preset)

        inferred_title = extracted_meta.get("title") or ""
        if not inferred_title:
            for line in req.text.splitlines():
                s = line.strip().lstrip("#").strip()
                if s and s.upper() not in {"MAKALAH", "SKRIPSI", "PROPOSAL", "KATA PENGANTAR", "DAFTAR ISI"}:
                    inferred_title = s[:60]
                    break
            extracted_meta["title"] = inferred_title

        clean_slug = _slugify_filename(inferred_title or f"{req.preset_id.upper()}-DOKUMEN")
        filename = req.filename or f"{clean_slug[:42]}.docx"
        if not filename.lower().endswith(".docx"):
            filename += ".docx"

        doc_id = str(uuid.uuid4())
        record = {
            "id": doc_id,
            "filename": filename,
            "size_bytes": len(raw_bytes),
            "created_at": int(time.time()),
            "source_type": "markdown",
            "original_bytes": raw_bytes,
            "active_bytes": raw_bytes,
            "raw_markdown": req.text,
            "status": "Belum diproses",
            "preset_id": req.preset_id,
            "extracted_meta": extracted_meta,
            "initial_pages": analysis["stats"]["estimated_pages"],
        }
        _save_session_record(doc_id, record)

        return {
            "doc_id": doc_id,
            "filename": filename,
            "size_kb": max(1, round(len(raw_bytes) / 1024)),
            "status": "Belum diproses",
            "preset_id": req.preset_id,
            "extracted_meta": extracted_meta,
            "analysis": analysis,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gagal memproses teks ke dokumen DOCX: {exc}")


@app.get("/api/documents/{doc_id}")
def get_document_state(doc_id: str, preset_id: Optional[str] = None):
    record = _get_session_record(doc_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan di sesi workspace.")

    active_preset_id = preset_id or record["preset_id"]
    preset = get_preset(active_preset_id)
    doc = Document(io.BytesIO(record["active_bytes"]))
    analysis = analyze_docx(doc, preset)

    page_delta = analysis["stats"]["estimated_pages"] - record.get("initial_pages", analysis["stats"]["estimated_pages"])

    return {
        "doc_id": doc_id,
        "filename": record["filename"],
        "size_kb": max(1, round(len(record["active_bytes"]) / 1024)),
        "status": record["status"],
        "preset_id": active_preset_id,
        "extracted_meta": record.get("extracted_meta", {}),
        "page_delta": page_delta,
        "analysis": analysis,
    }


@app.post("/api/documents/format")
def format_document(req: FormatDocumentRequest):
    try:
        record = _get_session_record(req.doc_id)
        if not record and req.raw_markdown and req.raw_markdown.strip():
            strip_cover = req.preset_id in ACADEMIC_COVER_PRESETS
            doc_rebuilt, extracted_meta = markdown_to_docx(
                req.raw_markdown, strip_raw_cover=strip_cover, preset_id=req.preset_id
            )
            rbuf = io.BytesIO()
            doc_rebuilt.save(rbuf)
            raw_bytes = rbuf.getvalue()
            record = {
                "id": req.doc_id,
                "filename": f"{_slugify_filename(extracted_meta.get('title') or req.preset_id)[:42]}.docx",
                "size_bytes": len(raw_bytes),
                "created_at": int(time.time()),
                "source_type": "markdown",
                "original_bytes": raw_bytes,
                "active_bytes": raw_bytes,
                "raw_markdown": req.raw_markdown,
                "status": "Belum diproses",
                "preset_id": req.preset_id,
                "extracted_meta": extracted_meta,
                "initial_pages": 1,
            }

        if not record:
            raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan. Silakan unggah ulang.")

        preset = get_preset(req.preset_id, req.custom_preset)

        raw_md = req.raw_markdown or record.get("raw_markdown")
        if record.get("edited_in_web"):
            source_doc = Document(io.BytesIO(record["active_bytes"]))
            merged_cover = dict(record.get("extracted_meta") or {})
        elif record.get("source_type") == "markdown" and raw_md:
            strip_cover = req.preset_id in ACADEMIC_COVER_PRESETS
            source_doc, fresh_meta = markdown_to_docx(
                raw_md, strip_raw_cover=strip_cover, preset_id=req.preset_id
            )
            merged_cover = dict(fresh_meta)
        else:
            source_doc = Document(io.BytesIO(record["original_bytes"]))
            merged_cover = dict(record.get("extracted_meta") or {})

        if req.cover_data:
            for k, v in req.cover_data.items():
                if v is not None and str(v).strip() != "":
                    merged_cover[k] = v

        formatted_doc = format_docx_document(
            source_doc=source_doc,
            preset=preset,
            rules=req.rules,
            cover_data=merged_cover,
        )

        out_buf = io.BytesIO()
        formatted_doc.save(out_buf)
        formatted_bytes = out_buf.getvalue()

        record["active_bytes"] = formatted_bytes
        record["status"] = "Siap diunduh"
        record["preset_id"] = req.preset_id
        record["extracted_meta"] = merged_cover
        _save_session_record(req.doc_id, record)

        post_analysis = analyze_docx(Document(io.BytesIO(formatted_bytes)), preset)
        page_delta = post_analysis["stats"]["estimated_pages"] - record.get("initial_pages", 1)

        return {
            "doc_id": req.doc_id,
            "filename": record["filename"],
            "size_kb": max(1, round(len(formatted_bytes) / 1024)),
            "status": record["status"],
            "preset_id": req.preset_id,
            "extracted_meta": merged_cover,
            "page_delta": page_delta,
            "analysis": post_analysis,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gagal memformat dokumen DOCX: {exc}")


@app.post("/api/documents/{doc_id}/update-content")
def update_document_content(doc_id: str, req: UpdateContentRequest):
    try:
        record = _get_session_record(doc_id)
        if not record:
            raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan di sesi workspace.")

        # Merge updated cover_data or logo_update into record metadata
        if "extracted_meta" not in record:
            record["extracted_meta"] = {}
        if req.cover_data:
            record["extracted_meta"].update(req.cover_data)
        if req.logo_update:
            record["extracted_meta"].update(req.logo_update)

        updated_bytes = apply_inline_edits_to_docx(
            record["active_bytes"],
            [p.model_dump() for p in req.paragraph_updates],
            [t.model_dump() for t in req.table_updates],
            logo_update=req.logo_update,
            cover_data=req.cover_data,
            deleted_p_indices=req.deleted_p_indices,
            new_pages=req.new_pages,
            reordered_p_indices=req.reordered_p_indices,
        )
        record["active_bytes"] = updated_bytes
        record["edited_in_web"] = True
        if record.get("status") == "Belum diproses":
            record["original_bytes"] = updated_bytes
        active_preset_id = req.preset_id or record["preset_id"]
        record["preset_id"] = active_preset_id
        _save_session_record(doc_id, record)

        preset = get_preset(active_preset_id)
        post_analysis = analyze_docx(Document(io.BytesIO(updated_bytes)), preset)
        page_delta = post_analysis["stats"]["estimated_pages"] - record.get("initial_pages", 1)

        return {
            "doc_id": doc_id,
            "filename": record["filename"],
            "size_kb": max(1, round(len(updated_bytes) / 1024)),
            "status": record["status"],
            "preset_id": active_preset_id,
            "extracted_meta": record.get("extracted_meta", {}),
            "page_delta": page_delta,
            "analysis": post_analysis,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan editan teks ke DOCX: {exc}")


@app.get("/api/documents/{doc_id}/download")
def download_docx(doc_id: str):
    record = _get_session_record(doc_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    safe_name = record["filename"].replace('"', "")
    if not safe_name.lower().endswith(".docx"):
        safe_name += ".docx"

    return StreamingResponse(
        io.BytesIO(record["active_bytes"]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@app.get("/api/documents/{doc_id}/preview-pdf")
def preview_pdf_libreoffice(doc_id: str):
    """Optional server-side PDF conversion via LibreOffice Headless if installed on the system."""
    record = _get_session_record(doc_id)
    if not record:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    soffice_bin = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice_bin:
        raise HTTPException(
            status_code=501,
            detail="LibreOffice headless tidak ditemukan di server; gunakan pratinjau A4 / docx-preview di sisi klien.",
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        in_path = os.path.join(tmpdir, "input.docx")
        out_path = os.path.join(tmpdir, "input.pdf")
        with open(in_path, "wb") as f:
            f.write(record["active_bytes"])
        subprocess.run(
            [soffice_bin, "--headless", "--convert-to", "pdf", "--outdir", tmpdir, in_path],
            check=True,
            timeout=30,
        )
        if not os.path.exists(out_path):
            raise HTTPException(status_code=500, detail="Konversi PDF gagal.")
        with open(out_path, "rb") as pf:
            pdf_bytes = pf.read()

    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
