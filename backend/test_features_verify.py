import io
import base64
from docx import Document
from PIL import Image as PILImage
from engine.formatter import apply_inline_edits_to_docx
from engine.ooxml_reader import iter_document_blocks

def create_sample_docx() -> bytes:
    doc = Document()
    # Empty paragraph at the top (like cover page gap)
    p0 = doc.add_paragraph("")
    # Title paragraph
    p1 = doc.add_paragraph("JUDUL UTAMA MAKALAH")
    # Subtitle paragraph
    p2 = doc.add_paragraph("Disusun oleh Tim Pengembang")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

def create_sample_base64_image() -> str:
    img = PILImage.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

def test_paragraph_deletion():
    raw_docx = create_sample_docx()
    # Delete p_idx 0 (empty paragraph)
    res_bytes = apply_inline_edits_to_docx(
        raw_docx,
        paragraph_updates=[],
        table_updates=[],
        deleted_p_indices=[0],
    )
    doc = Document(io.BytesIO(res_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    assert len(paragraphs) == 2, f"Expected 2 paragraphs, got {len(paragraphs)}"
    assert paragraphs[0] == "JUDUL UTAMA MAKALAH", f"First paragraph is {paragraphs[0]}"
    print("PASS: test_paragraph_deletion (Empty gap deleted, title snapped to top!)")

def test_paragraph_reordering():
    raw_docx = create_sample_docx()
    # Swap p1 and p2: desired order [2, 1]
    res_bytes = apply_inline_edits_to_docx(
        raw_docx,
        paragraph_updates=[],
        table_updates=[],
        reordered_p_indices=[2, 1],
    )
    doc = Document(io.BytesIO(res_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    assert paragraphs[0] == "Disusun oleh Tim Pengembang", f"Expected subtitle first, got {paragraphs[0]}"
    assert paragraphs[1] == "JUDUL UTAMA MAKALAH", f"Expected title second, got {paragraphs[1]}"
    print("PASS: test_paragraph_reordering (Paragraphs swapped successfully!)")

def test_image_replacement():
    raw_docx = create_sample_docx()
    b64_img = create_sample_base64_image()
    # Replace p2 with image
    res_bytes = apply_inline_edits_to_docx(
        raw_docx,
        paragraph_updates=[
            {
                "p_idx": 2,
                "image_base64": b64_img,
                "image_width_cm": 5.0,
                "align": "center",
            }
        ],
        table_updates=[],
    )
    doc = Document(io.BytesIO(res_bytes))
    # Paragraph 2 should now have a drawing
    from docx.oxml.ns import qn
    p2 = doc.paragraphs[2]
    has_drawing = any(el.tag in {qn("w:drawing"), qn("w:pict")} for el in p2._p.iter())
    assert has_drawing, "Paragraph 2 should contain an embedded drawing"
    print("PASS: test_image_replacement (Paragraph replaced with embedded image!)")

def test_new_page_addition():
    raw_docx = create_sample_docx()
    res_bytes = apply_inline_edits_to_docx(
        raw_docx,
        paragraph_updates=[],
        table_updates=[],
        new_pages=[
            {
                "page_number": 2,
                "blocks": [
                    {"type": "h2", "text": "Slide Tambahan Baru", "align": "left"},
                    {"type": "paragraph", "text": "Isi teks di halaman baru.", "align": "justify"},
                ],
            }
        ],
    )
    doc = Document(io.BytesIO(res_bytes))
    all_texts = [p.text for p in doc.paragraphs if p.text.strip()]
    assert "Slide Tambahan Baru" in all_texts, "New page heading should exist"
    assert "Isi teks di halaman baru." in all_texts, "New page text should exist"
    print("PASS: test_new_page_addition (New slide/page added with page break!)")

if __name__ == "__main__":
    test_paragraph_deletion()
    test_paragraph_reordering()
    test_image_replacement()
    test_new_page_addition()
    print("ALL BACKEND FEATURE TESTS PASSED!")
