# RapiDoc — Smart Document Auto-Formatter

**RapiDoc** adalah aplikasi web Full-Stack untuk memeriksa, menganalisis, dan merapikan format dokumen Microsoft Word (`.docx`) serta teks/Markdown mentah (seperti hasil dari ChatGPT/Claude) menjadi file `.docx` yang rapi, sesuai standar pedoman, dan tetap **100% editable di Microsoft Word**.

---

## Fitur Utama

1. **Dual Input (Unggah DOCX & Tempel Teks/Markdown)**
   - **Tab Unggah DOCX**: Drag & drop file `.docx` (maks. 20 MB) dengan validasi struktur ZIP & elemen OOXML (`word/document.xml`).
   - **Tab Tempel Teks / Markdown**: Konversi otomatis `#` (BAB/Heading 1), `##` (Subbab/Heading 2), `###` (Anak Subbab), `-` (Bullet list), `1.` (Numbering), tabel Markdown, dan `---` (Page break) menjadi dokumen Word terstruktur.
2. **5 Preset Template + Kelola Template Custom**
   - **Makalah Kuliah**: A4, Margin 4-3-3-3 cm, Times New Roman 12 pt, Spasi 1.5.
   - **Skripsi / Tugas Akhir / Laporan Magang**: A4, Margin 4-4-3-3 cm, Times New Roman 12 pt, Spasi 1.5, Bab baru di halaman baru.
   - **Proposal Kegiatan / Organisasi**: A4, Margin 3-3-3-3 cm, Calibri 11 pt, Spasi 1.15, Lembar Pengesahan.
   - **Surat Resmi**: A4, Kop Surat otomatis dengan garis ganda OOXML, Nomor/Lampiran/Perihal sejajar, Blok Tanda Tangan.
   - **CV ATS-Friendly**: A4, Margin 2-2-2-2 cm, Calibri 10.5 pt, layout satu kolom bersih lolos parser ATS.
   - **Kelola Template Custom**: Ubah dan simpan aturan margin tiap sisi, jenis font, ukuran font, spasi baris, indentasi, dan perataan.
3. **12 Aturan Auto-Formatting OOXML (`python-docx` + `lxml`)**
   - `[x]` Margin halaman (atas, bawah, kiri, kanan)
   - `[x]` Jenis font (selaraskan semua run teks di slot `ascii`, `hAnsi`, `cs`, `eastAsia`)
   - `[x]` Ukuran teks (termasuk teks dalam tabel)
   - `[x]` Spasi baris (`line_spacing`)
   - `[x]` Indentasi baris pertama paragraf
   - `[x]` Perataan teks (`justify` / `left` / `center`)
   - `[x]` Heading BAB & Subbab (tebal, ukuran, perataan, `w:outlineLvl`)
   - `[x]` Jarak antarparagraf (`space_before` & `space_after`)
   - `[x]` Penomoran halaman (Section Break `nextPage` dengan angka Romawi `i, ii, iii` untuk halaman awal & angka Arab `1, 2, 3` untuk isi)
   - `[x]` Sisipkan Daftar Isi otomatis (Word native `TOC \o "1-3" \h \z \u` Field)
   - `[x]` Buat Cover / Kop Surat otomatis (lengkap dengan form Judul, Mata Kuliah, Dosen, Upload Logo Kampus/Instansi, Nama/NIM, Prodi, Fakultas, Universitas, Tahun)
   - `[x]` Halaman tambahan otomatis (Kata Pengantar / Lembar Pengesahan / Blok Tanda Tangan)
4. **Tab Pemeriksaan (Audit Format Per Paragraf)**
   - Memetakan setiap pelanggaran format per paragraf (contoh: *"Paragraf 4: Font menggunakan Arial 11pt, seharusnya Times New Roman 12pt"*).
5. **Responsive Split-View (Desktop) & Slide-Over Drawer (Mobile)**
   - Dilengkapi Document Previewer halaman A4 interaktif (`1 / 18`, zoom `- 95% +`, mode scroll semua halaman, serta mode render binary OOXML langsung di browser via `docx-preview`).

---

## Struktur Folder Project

```text
rapidoc/
├── backend/                  # Backend FastAPI + OOXML Document Engine
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── presets.py        # 5 Preset Template & Custom Template Manager
│   │   ├── markdown_parser.py# Parser Markdown/Teks AI ke python-docx
│   │   ├── analyzer.py       # Audit format per paragraf & A4 paginator
│   │   └── formatter.py      # Manipulasi OOXML (python-docx + lxml) 12 aturan
│   ├── main.py               # FastAPI Endpoints (/api/documents/*, /api/presets)
│   └── requirements.txt
└── frontend/                 # Frontend Next.js (App Router) + Tailwind CSS
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx      # Landing Page RapiDoc
    │   │   ├── workspace/
    │   │   │   └── page.tsx  # Halaman Input Dokumen Baru & Workspace
    │   │   ├── layout.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── TemplateModal.tsx      # Modal Kelola Template Custom
    │   │   └── DocxClientRenderer.tsx # Client-side DOCX previewer (docx-preview)
    │   └── lib/
    │       ├── api.ts        # Klien REST API
    │       └── sampleData.ts # Preset metadata & contoh Makalah Markdown
    ├── package.json
    ├── tailwind.config.ts
    └── next.config.mjs
```

---

## Cara Menjalankan Secara Lokal

### 1. Jalankan Backend (FastAPI)

Buka terminal pertama dan masuk ke folder `backend`:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
API Backend akan aktif di `http://localhost:8000` (dokumentasi Swagger tersedia di `http://localhost:8000/docs`).

### 2. Jalankan Frontend (Next.js)

Buka terminal kedua dan masuk ke folder `frontend`:

```bash
cd frontend
npm install
npm run dev
```
Buka browser di **`http://localhost:3000`** melalui Desktop maupun Handphone.
