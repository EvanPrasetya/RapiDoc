export interface PresetTemplate {
  id: string;
  name: string;
  short_name: string;
  category: string;
  description: string;
  page_size: string;
  width_cm: number;
  height_cm: number;
  margin_top_cm: number;
  margin_bottom_cm: number;
  margin_left_cm: number;
  margin_right_cm: number;
  margin_label: string;
  font_name: string;
  font_size_pt: number;
  table_font_size_pt: number;
  line_spacing: number;
  first_line_indent_cm: number;
  alignment: "justify" | "left" | "center" | "right";
  h1_size_pt: number;
  h2_size_pt: number;
  chapter_page_break: boolean;
  use_roman_front_matter: boolean;
  include_toc: boolean;
  cover_style: string;
  extra_page_type: string;
  extra_page_label: string;
  extra_page_desc: string;
  is_custom?: boolean;
}

export interface FormattingRuleItem {
  key: string;
  title: string;
  subtitle: string;
}

export const FORMATTING_RULES_META: FormattingRuleItem[] = [
  {
    key: "margins",
    title: "Margin halaman",
    subtitle: "Atur margin tiap sisi (atas, bawah, kiri, kanan)",
  },
  {
    key: "font_family",
    title: "Jenis font",
    subtitle: "Selaraskan semua run teks",
  },
  {
    key: "font_size",
    title: "Ukuran teks",
    subtitle: "Termasuk teks dalam tabel",
  },
  {
    key: "line_spacing",
    title: "Spasi baris",
    subtitle: "Line spacing paragraf",
  },
  {
    key: "indentation",
    title: "Indentasi",
    subtitle: "Baris pertama paragraf",
  },
  {
    key: "alignment",
    title: "Perataan",
    subtitle: "Justify / kiri / tengah",
  },
  {
    key: "headings",
    title: "Heading BAB & subbab",
    subtitle: "Tebal, ukuran, perataan",
  },
  {
    key: "paragraph_spacing",
    title: "Jarak antarparagraf",
    subtitle: "Spasi sebelum & sesudah",
  },
  {
    key: "page_numbering",
    title: "Penomoran halaman",
    subtitle: "Section Romawi & Arab",
  },
  {
    key: "toc",
    title: "Sisipkan daftar isi",
    subtitle: "Field TOC yang bisa diperbarui",
  },
  {
    key: "auto_cover",
    title: "Buat cover / kop otomatis",
    subtitle: "Jika dokumen belum punya cover",
  },
  {
    key: "extra_pages",
    title: "Kata pengantar & tanda tangan",
    subtitle: "Halaman tambahan sesuai jenis dokumen",
  },
];

export const INITIAL_PRESETS: PresetTemplate[] = [
  {
    id: "makalah",
    name: "Makalah Kuliah",
    short_name: "Tugas Makalah",
    category: "Akademik",
    description:
      "Standar makalah kuliah: A4, margin 4-4-3-3 cm, Times New Roman 12 pt, spasi 1,5.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 4.0,
    margin_left_cm: 4.0,
    margin_bottom_cm: 3.0,
    margin_right_cm: 3.0,
    margin_label: "4-4-3-3 cm",
    font_name: "Times New Roman",
    font_size_pt: 12.0,
    table_font_size_pt: 11.0,
    line_spacing: 1.5,
    first_line_indent_cm: 1.25,
    alignment: "justify",
    h1_size_pt: 14.0,
    h2_size_pt: 12.0,
    chapter_page_break: true,
    use_roman_front_matter: true,
    include_toc: true,
    cover_style: "academic_makalah",
    extra_page_type: "kata_pengantar",
    extra_page_label: "Kata pengantar & tanda tangan",
    extra_page_desc: "Dibuat/dirapikan sesuai format makalah",
  },
  {
    id: "skripsi",
    name: "Skripsi / Tugas Akhir",
    short_name: "Skripsi & TA",
    category: "Akademik",
    description:
      "Standar karya ilmiah & tugas akhir: A4, margin 4-4-3-3 cm, Times New Roman 12 pt, spasi 1,5, bab baru di halaman baru.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 4.0,
    margin_left_cm: 4.0,
    margin_bottom_cm: 3.0,
    margin_right_cm: 3.0,
    margin_label: "4-4-3-3 cm",
    font_name: "Times New Roman",
    font_size_pt: 12.0,
    table_font_size_pt: 10.0,
    line_spacing: 1.5,
    first_line_indent_cm: 1.25,
    alignment: "justify",
    h1_size_pt: 14.0,
    h2_size_pt: 12.0,
    chapter_page_break: true,
    use_roman_front_matter: true,
    include_toc: true,
    cover_style: "academic_skripsi",
    extra_page_type: "lembar_pengesahan_dan_kata_pengantar",
    extra_page_label: "Lembar pengesahan & kata pengantar",
    extra_page_desc: "Halaman pengesahan dosen pembimbing & kata pengantar",
  },
  {
    id: "laporan_magang",
    name: "Laporan Magang / PKL / KKN",
    short_name: "Laporan Magang",
    category: "Magang & PKL",
    description:
      "Format laporan magang industri/PKL: A4, margin 4-4-3-3 cm, Times New Roman 12 pt, spasi 1,5, lembar pengesahan.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 4.0,
    margin_left_cm: 4.0,
    margin_bottom_cm: 3.0,
    margin_right_cm: 3.0,
    margin_label: "4-4-3-3 cm",
    font_name: "Times New Roman",
    font_size_pt: 12.0,
    table_font_size_pt: 10.5,
    line_spacing: 1.5,
    first_line_indent_cm: 1.25,
    alignment: "justify",
    h1_size_pt: 14.0,
    h2_size_pt: 12.0,
    chapter_page_break: true,
    use_roman_front_matter: true,
    include_toc: true,
    cover_style: "academic_magang",
    extra_page_type: "lembar_pengesahan_magang",
    extra_page_label: "Lembar pengesahan magang & kata pengantar",
    extra_page_desc: "Pengesahan pembimbing lapangan/instansi & dosen pembimbing",
  },
  {
    id: "proposal",
    name: "Proposal Kegiatan / Organisasi",
    short_name: "Proposal Kegiatan",
    category: "Organisasi",
    description:
      "Format proposal kegiatan/proyek: A4, margin 3-3-3-3 cm, Calibri 11 pt, spasi 1,15, lengkap dengan Lembar Pengesahan.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 3.0,
    margin_left_cm: 3.0,
    margin_bottom_cm: 3.0,
    margin_right_cm: 3.0,
    margin_label: "3-3-3-3 cm",
    font_name: "Calibri",
    font_size_pt: 11.0,
    table_font_size_pt: 10.0,
    line_spacing: 1.15,
    first_line_indent_cm: 1.0,
    alignment: "justify",
    h1_size_pt: 13.0,
    h2_size_pt: 11.5,
    chapter_page_break: false,
    use_roman_front_matter: true,
    include_toc: true,
    cover_style: "proposal_cover",
    extra_page_type: "lembar_pengesahan_proposal",
    extra_page_label: "Lembar pengesahan proposal",
    extra_page_desc: "Blok pengesahan Ketua Panitia & Pembina",
  },
  {
    id: "surat_resmi",
    name: "Surat Resmi Instansi / Sekolah",
    short_name: "Surat Resmi",
    category: "Administrasi",
    description:
      "A4, margin 2.5-3-2.5-2.5 cm, Kop Surat & Logo otomatis, Nomor/Lampiran/Perihal sejajar, Blok Tanda Tangan.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 2.5,
    margin_left_cm: 3.0,
    margin_bottom_cm: 2.5,
    margin_right_cm: 2.5,
    margin_label: "2.5-3-2.5-2.5 cm",
    font_name: "Times New Roman",
    font_size_pt: 12.0,
    table_font_size_pt: 12.0,
    line_spacing: 1.15,
    first_line_indent_cm: 0.0,
    alignment: "justify",
    h1_size_pt: 12.0,
    h2_size_pt: 12.0,
    chapter_page_break: false,
    use_roman_front_matter: false,
    include_toc: false,
    cover_style: "kop_surat",
    extra_page_type: "blok_tanda_tangan",
    extra_page_label: "Blok tanda tangan pejabat",
    extra_page_desc: "Kop surat, Nomor/Lampiran/Perihal & tanda tangan",
  },
  {
    id: "cv_ats",
    name: "CV ATS-Friendly (Melamar Kerja)",
    short_name: "CV ATS",
    category: "Karier & Kerja",
    description:
      "A4, margin 2-2-2-2 cm, Calibri 10,5 pt, spasi 1,15, layout satu kolom bersih lolos sistem ATS HRD.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 2.0,
    margin_left_cm: 2.0,
    margin_bottom_cm: 2.0,
    margin_right_cm: 2.0,
    margin_label: "2-2-2-2 cm",
    font_name: "Calibri",
    font_size_pt: 10.5,
    table_font_size_pt: 10.0,
    line_spacing: 1.15,
    first_line_indent_cm: 0.0,
    alignment: "left",
    h1_size_pt: 12.0,
    h2_size_pt: 10.5,
    chapter_page_break: false,
    use_roman_front_matter: false,
    include_toc: false,
    cover_style: "cv_header",
    extra_page_type: "none",
    extra_page_label: "Profil satu kolom standar ATS",
    extra_page_desc: "Bebas tabel bersarang agar terbaca sempurna oleh sistem ATS",
  },
  {
    id: "surat_lamaran",
    name: "Surat Lamaran Kerja & Cover Letter",
    short_name: "Surat Lamaran",
    category: "Karier & Kerja",
    description:
      "Standar melamar kerja/magang: A4, margin 2.5-2.5-2.5-2.5 cm, Calibri 11 pt, spasi 1,15, rapi untuk HRD.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 2.5,
    margin_left_cm: 2.5,
    margin_bottom_cm: 2.5,
    margin_right_cm: 2.5,
    margin_label: "2.5-2.5-2.5-2.5 cm",
    font_name: "Calibri",
    font_size_pt: 11.0,
    table_font_size_pt: 10.5,
    line_spacing: 1.15,
    first_line_indent_cm: 0.0,
    alignment: "justify",
    h1_size_pt: 12.0,
    h2_size_pt: 11.0,
    chapter_page_break: false,
    use_roman_front_matter: false,
    include_toc: false,
    cover_style: "none",
    extra_page_type: "blok_ttd_pelamar",
    extra_page_label: "Salam penutup & tanda tangan pelamar",
    extra_page_desc: "Blok hormat saya & nama lengkap pelamar di kanan bawah",
  },
  {
    id: "laporan_kerja",
    name: "Laporan Kerja / Berita Acara / Notulen",
    short_name: "Laporan Kerja",
    category: "Perkantoran",
    description:
      "Dokumen operasional kantor: A4, margin 2.5-3-2.5-2.5 cm, Arial 11 pt, spasi 1,15, Kop & pengesahan.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 2.5,
    margin_left_cm: 3.0,
    margin_bottom_cm: 2.5,
    margin_right_cm: 2.5,
    margin_label: "2.5-3-2.5-2.5 cm",
    font_name: "Arial",
    font_size_pt: 11.0,
    table_font_size_pt: 10.0,
    line_spacing: 1.15,
    first_line_indent_cm: 0.0,
    alignment: "justify",
    h1_size_pt: 13.0,
    h2_size_pt: 11.0,
    chapter_page_break: false,
    use_roman_front_matter: false,
    include_toc: false,
    cover_style: "kop_surat",
    extra_page_type: "blok_tanda_tangan",
    extra_page_label: "Blok tanda tangan penanggung jawab",
    extra_page_desc: "Kop perusahaan/instansi & tanda tangan laporan/notulen",
  },
  {
    id: "jurnal_artikel",
    name: "Artikel Jurnal / Paper Ilmiah",
    short_name: "Artikel Jurnal",
    category: "Akademik",
    description:
      "Format naskah publikasi jurnal: A4, margin 2.5-2.5-2.5-2.5 cm, Times New Roman 11 pt, spasi 1,15.",
    page_size: "A4",
    width_cm: 21.0,
    height_cm: 29.7,
    margin_top_cm: 2.5,
    margin_left_cm: 2.5,
    margin_bottom_cm: 2.5,
    margin_right_cm: 2.5,
    margin_label: "2.5-2.5-2.5-2.5 cm",
    font_name: "Times New Roman",
    font_size_pt: 11.0,
    table_font_size_pt: 9.5,
    line_spacing: 1.15,
    first_line_indent_cm: 1.0,
    alignment: "justify",
    h1_size_pt: 12.0,
    h2_size_pt: 11.0,
    chapter_page_break: false,
    use_roman_front_matter: false,
    include_toc: false,
    cover_style: "none",
    extra_page_type: "none",
    extra_page_label: "Tanpa halaman tambahan (format paper)",
    extra_page_desc: "Langsung judul, abstrak, isi, dan daftar pustaka",
  },
];

function TrueBoolean() {
  return true;
}

export const SAMPLE_MAKALAH_MARKDOWN = `# MAKALAH
# KEHIDUPAN MANUSIA: HAKIKAT, PERKEMBANGAN, DAN TANTANGANNYA

Disusun untuk memenuhi tugas mata kuliah:
FISIKA

**Dosen Pengampu:**
Syahroni Hidayat S.T., M.Eng.

**Disusun oleh:**
Nama: MUHAMMAD FAHRI FIRDAUSSILLAH
NIM: 2605090003
Program Studi: PENDIDIKAN TEKNIK INFORMATIKA DAN KOMPUTER

**FAKULTAS TEKNIK**
**UNIVERSITAS NEGERI SEMARANG**
**2026**

---

# KATA PENGANTAR

Puji syukur ke hadirat Tuhan Yang Maha Esa karena atas rahmat dan karunia-Nya, makalah yang berjudul "Kehidupan Manusia: Hakikat, Perkembangan, dan Tantangannya" ini dapat diselesaikan dengan baik.

Makalah ini disusun untuk memberikan pemahaman yang komprehensif mengenai dinamika kehidupan manusia mulai dari konsep dasar biologis dan filosofis, tahapan tumbuh kembang, hingga tantangan di era perkembangan teknologi modern.

Penulis menyadari bahwa makalah ini masih memiliki kekurangan. Oleh karena itu, kritik dan saran yang membangun sangat diharapkan demi kesempurnaan karya tulis ini.

---

# BAB I
# PENDAHULUAN

## 1.1 Latar Belakang
Kehidupan manusia merupakan fenomena multidimensional yang mencakup aspek biologis, psikologis, sosial, dan spiritual. Sejak awal peradaban, manusia terus berusaha memahami hakikat keberadaannya di dunia serta beradaptasi dengan perubahan lingkungan alam maupun sosial yang terus bergerak dinamis.

Di era modern saat ini, percepatan teknologi informasi dan perubahan tatanan global membawa dampak besar terhadap cara manusia berinteraksi, bekerja, dan mempertahankan kualitas hidupnya. Pemahaman yang mendalam tentang hakikat dan perkembangan manusia menjadi kunci utama dalam menghadapi tantangan zaman.

## 1.2 Rumusan Masalah
Berdasarkan latar belakang di atas, rumusan masalah dalam makalah ini adalah:
1. Apa pengertian dan hakikat kehidupan manusia dari sudut pandang ilmiah dan sosial?
2. Bagaimana tahapan perkembangan kehidupan manusia sejak dini hingga dewasa?
3. Apa saja kebutuhan dasar manusia dalam mempertahankan keberlangsungan hidupnya?
4. Bagaimana peran manusia sebagai makhluk individu dan makhluk sosial?
5. Apa saja tantangan kehidupan manusia di era perkembangan teknologi modern?

## 1.3 Tujuan Penulisan
Tujuan penulisan makalah ini adalah:
1. Menjelaskan pengertian dan hakikat kehidupan manusia.
2. Mengetahui tahapan perkembangan kehidupan manusia.
3. Mengidentifikasi berbagai kebutuhan dasar manusia.
4. Memahami peran manusia sebagai makhluk sosial.
5. Mengetahui faktor-faktor yang memengaruhi kehidupan manusia.
6. Menjelaskan pengaruh perkembangan teknologi terhadap kehidupan manusia.
7. Mengidentifikasi permasalahan yang terjadi dalam kehidupan manusia.

## 1.4 Manfaat Penulisan
Makalah ini diharapkan dapat memberikan manfaat sebagai berikut:
1. **Bagi mahasiswa**, menambah pengetahuan mengenai hakikat dan berbagai aspek kehidupan manusia.
2. **Bagi pembaca**, memberikan pemahaman mengenai faktor-faktor yang memengaruhi kehidupan serta hubungan manusia dengan lingkungan sosialnya.
3. **Bagi penulis**, menjadi sarana untuk memahami kehidupan manusia dari berbagai sudut pandang.

---

# BAB II
# PEMBAHASAN

## 2.1 Hakikat Kehidupan Manusia
Manusia adalah makhluk ciptaan Tuhan yang dibekali akal budi, hati nurani, dan kehendak bebas. Berbeda dengan makhluk hidup lainnya, manusia mampu menciptakan kebudayaan, mengembangkan ilmu pengetahuan, serta membangun sistem nilai untuk mengatur kehidupan bersama.

Hakikat manusia dapat ditinjau dari beberapa dimensi utama:
- **Dimensi Individual**: Setiap manusia memiliki keunikan karakter, potensi, dan tanggung jawab pribadi.
- **Dimensi Sosial**: Manusia tidak dapat hidup sendiri dan senantiasa membutuhkan interaksi dengan sesama.
- **Dimensi Moral dan Spiritual**: Manusia memiliki pedoman etika serta kesadaran akan nilai luhur dalam bertindak.

## 2.2 Tahapan Perkembangan Manusia
Sepanjang rentang kehidupannya, manusia melewati serangkaian fase perkembangan fisik maupun psikologis yang saling berkaitan. Setiap fase menuntut penyesuaian diri terhadap lingkungan keluarga, pendidikan, dan masyarakat luas.

| Fase Perkembangan | Rentang Usia | Karakteristik Utama |
|---|---|---|
| Masa Kanak-Kanak | 0 - 11 Tahun | Pertumbuhan fisik pesat dan pembentukan karakter dasar |
| Masa Remaja | 12 - 21 Tahun | Pencarian jati diri dan perkembangan kognitif abstrak |
| Masa Dewasa | 22 - 59 Tahun | Kemandirian ekonomi, karier, dan tanggung jawab sosial |
| Masa Lansia | 60+ Tahun | Refleksi pengalaman hidup dan adaptasi kesehatan fisik |

## 2.3 Hubungan Sosial dan Perkembangan Teknologi
Transformasi digital telah mengubah pola komunikasi antarmanusia secara fundamental. Teknologi mempermudah akses informasi lintas batas geografis, namun di sisi lain menuntut literasi digital serta kebijaksanaan agar nilai empati dan kohesi sosial tetap terjaga.

Upaya tersebut perlu dilakukan secara berkelanjutan karena kualitas kehidupan tidak hanya ditentukan oleh satu faktor, melainkan oleh keseimbangan berbagai aspek kehidupan manusia.

---

# BAB III
# PENUTUP

## 3.1 Kesimpulan
Kehidupan manusia merupakan proses yang berlangsung sejak lahir hingga akhir hayat dan mencakup berbagai aspek biologis, psikologis, sosial, serta teknologi. Untuk mencapai kehidupan yang berkualitas, manusia perlu menjaga keseimbangan antara pemenuhan kebutuhan diri, tanggung jawab sosial, dan kemampuan beradaptasi terhadap perubahan zaman.

## 3.2 Saran
Selain itu, diperlukan kesadaran untuk saling menghargai, bekerja sama, dan membantu sesama dalam kehidupan bermasyarakat. Dengan menerapkan sikap tersebut, diharapkan tercipta kehidupan yang lebih baik, harmonis, dan sejahtera.

---

# DAFTAR PUSTAKA

Koentjaraningrat. (2015). *Pengantar Ilmu Antropologi*. Jakarta: Rineka Cipta.
Notoadmodjo, S. (2018). *Ilmu Perilaku dan Perkembangan Manusia*. Jakarta: Salemba Medika.
Soekanto, S. (2017). *Sosiologi Suatu Pengantar*. Jakarta: Rajawali Pers.
`;

export const SAMPLE_TEXT_BY_PRESET: Record<string, string> = {
  makalah: SAMPLE_MAKALAH_MARKDOWN,
  skripsi: `# SKRIPSI
# RANCANG BANGUN SISTEM INFORMASI MANAJEMEN AKADEMIK BERBASIS WEB

Diajukan untuk memenuhi salah satu syarat memperoleh gelar Sarjana

**Dosen Pembimbing:**
Dr. Budi Santoso, M.Kom

**Disusun oleh:**
Nama: Andi Pratama
NIM: G.211.23.0045
Program Studi: Teknik Informatika

**FAKULTAS TEKNOLOGI INFORMASI DAN KOMPUTER**
**UNIVERSITAS SEMARANG**
**2026**

---

# BAB I
# PENDAHULUAN

## 1.1 Latar Belakang
Transformasi digital di perguruan tinggi menuntut sistem pengelolaan data akademik yang terintegrasi, akurat, dan mudah diakses oleh mahasiswa maupun dosen.

## 1.2 Rumusan Masalah
1. Bagaimana merancang arsitektur sistem informasi akademik yang responsif?
2. Bagaimana mengukur efisiensi waktu pemrosesan administrasi akademik?

# BAB II
# TINJAUAN PUSTAKA

## 2.1 Sistem Informasi Akademik
Sistem informasi akademik merupakan platform terpadu yang mengelola data perkuliahan, penilaian, dan presensi mahasiswa secara daring.
`,
  laporan_magang: `# LAPORAN MAGANG
# IMPLEMENTASI SISTEM OTOMATISASI LAYANAN PELANGGAN BERBASIS WEB PADA PT TEKNOLOGI NUSANTARA

**Dosen Pembimbing:**
Dr. Budi Santoso, M.Kom

**Disusun oleh:**
Nama: Andi Pratama
NIM: G.211.23.0045
Program Studi: Sistem Informasi

**FAKULTAS TEKNOLOGI INFORMASI**
**UNIVERSITAS SEMARANG**
**2026**

---

# BAB I
# PENDAHULUAN

## 1.1 Latar Belakang Magang
Program Magang Industri memberikan pengalaman langsung kepada mahasiswa untuk mengaplikasikan kompetensi pengembangan perangkat lunak di lingkungan kerja profesional.

## 1.2 Tujuan Pelaksanaan
1. Memahami alur pengembangan sistem berbasis web di industri.
2. Berkontribusi dalam peningkatan efisiensi operasional tim teknologi informasi.
`,
  proposal: `# PROPOSAL KEGIATAN
# SEMINAR NASIONAL INOVASI TEKNOLOGI DIGITAL UNTUK UMKM 2026

**Disusun oleh:**
Nama: Panitia Pelaksana Himpunan Mahasiswa Sistem Informasi
**UNIVERSITAS SEMARANG**
**2026**

---

# BAB I
# PENDAHULUAN

## 1.1 Latar Belakang Kegiatan
Perkembangan teknologi kecerdasan buatan membuka peluang besar bagi pelaku UMKM untuk meningkatkan daya saing dan efisiensi operasional usaha.

## 1.2 Tujuan Kegiatan
1. Memberikan literasi digital praktis bagi 200 pelaku UMKM lokal.
2. Membangun jejaring kolaborasi antara mahasiswa dan pelaku industri.

## 1.3 Rencana Anggaran Biaya
| Komponen | Kebutuhan | Estimasi Biaya |
|---|---|---|
| Konsumsi Peserta | 200 Paket | Rp 4.000.000 |
| Honorarium Narasumber | 2 Orang | Rp 3.000.000 |
| Publikasi & Dokumentasi | 1 Paket | Rp 1.500.000 |
`,
  cv_ats: `ALFARELL NABIL EVAN PRASETYA
Semarang, Jawa Tengah, Indonesia
081229259056 | evansprasetyaa@gmail.com | github.com/evanprasetya

RINGKASAN PROFESIONAL
Mahasiswa aktif semester 6 Program Studi S1 Sistem Informasi di Universitas Semarang dengan IPK 3.55 yang memiliki minat dan kompetensi di bidang Web Development, UI/UX Design, dan Analisis Sistem Informasi. Berpengalaman membangun berbagai aplikasi web full-stack berbasis Laravel, React, dan Next.js serta memiliki jiwa kewirausahaan melalui pengelolaan bisnis ritel daring mandiri. Terbiasa bekerja secara terstruktur, komunikatif, dan siap berkontribusi dalam program magang Teknologi Informasi.

PENDIDIKAN
Universitas Semarang — S1 Sistem Informasi (2023 - Sekarang)
- IPK Saat Ini: 3.55 / 4.00
- Mata Kuliah Relevan: Pemrograman Web, Basis Data, Analisis & Perancangan Sistem Informasi, Interaksi Manusia dan Komputer.

PENGALAMAN PROYEK & KERJA
Pengembang Web Full-Stack (Proyek Akademik & Mandiri) | 2024 - 2026
- Membangun aplikasi web manajemen dokumen otomatis menggunakan Next.js, Tailwind CSS, dan FastAPI.
- Merancang antarmuka responsif untuk desktop dan perangkat mobile dengan fokus kemudahan pengguna.

Wirausaha Ritel Daring Mandiri | 2023 - Sekarang
- Mengelola operasional toko daring mulai dari manajemen stok, pencatatan keuangan, hingga layanan pelanggan.
- Meningkatkan efisiensi pencatatan pesanan harian menggunakan template digital terstandar.

KEAHLIAN
- Pengembangan Web: HTML, CSS, JavaScript, TypeScript, React, Next.js, Laravel, Python, FastAPI
- Desain & Analisis: UI/UX Design, Figma, Pemodelan Basis Data (MySQL/PostgreSQL), Dokumentasi Sistem
- Soft Skills: Komunikasi Tim, Pemecahan Masalah, Manajemen Waktu, Adaptif
`,
  surat_resmi: `Kepada Yth.
Bapak/Ibu Pimpinan PT Teknologi Nusantara
di Tempat

Nomor: 042/HMSI/USM/XI/2026
Lampiran: 1 (Satu) Berkas Proposal
Perihal: Permohonan Izin Kunjungan Industri & Kerja Sama Magang

Dengan hormat,
Sehubungan dengan pelaksanaan program kerja Himpunan Mahasiswa Sistem Informasi Universitas Semarang tahun 2026, kami bermaksud mengajukan permohonan izin kunjungan industri sekaligus penjajakan kerja sama program magang mahasiswa pada perusahaan yang Bapak/Ibu pimpin.

Adapun rencana kegiatan tersebut akan dilaksanakan pada:
Hari/Tanggal: Rabu, 25 November 2026
Waktu: 09.00 - 12.00 WIB
Tempat: Kantor Pusat PT Teknologi Nusantara, Semarang

Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
`,
  surat_lamaran: `Semarang, 21 November 2026

Hal: Lamaran Posisi Web Developer Intern
Lampiran: 1 (Satu) Berkas CV & Portofolio

Kepada Yth.
HRD Manager PT Teknologi Nusantara
di Tempat

Dengan hormat,
Saya yang bertanda tangan di bawah ini:
Nama: Alfarell Nabil Evan Prasetya
Pendidikan: Mahasiswa S1 Sistem Informasi, Universitas Semarang (Semester 6, IPK 3.55)
Alamat: Semarang, Jawa Tengah
No. HP: 081229259056

Melalui surat ini, saya mengajukan lamaran untuk bergabung dalam program magang sebagai Web Developer Intern di perusahaan yang Bapak/Ibu pimpin. Saya memiliki pengalaman dalam pengembangan aplikasi web full-stack menggunakan React, Next.js, Laravel, dan Python serta terbiasa bekerja secara terstruktur baik individu maupun tim.

Sebagai bahan pertimbangan, saya lampirkan daftar riwayat hidup (CV) serta portofolio proyek yang pernah saya kerjakan. Besar harapan saya untuk dapat diberikan kesempatan mengikuti tahap wawancara lebih lanjut.

Demikian surat lamaran ini saya sampaikan. Atas perhatian Bapak/Ibu, saya mengucapkan terima kasih.
`,
  laporan_kerja: `# BERITA ACARA & LAPORAN KEGIATAN EVALUASI SISTEM INFORMASI

Hari/Tanggal: Jumat, 21 November 2026
Waktu: 09.00 - 11.30 WIB
Tempat: Ruang Rapat Lantai 2, Divisi Teknologi Informasi

## 1. Ringkasan Kegiatan
Pertemuan evaluasi bulanan dilaksanakan untuk meninjau capaian implementasi digitalisasi administrasi serta menetapkan target pembaruan aplikasi kuartal berikutnya.

## 2. Hasil Pembahasan & Tindak Lanjut
1. Migrasi basis data layanan pelanggan telah selesai 100% tanpa gangguan operasional.
2. Tim pengembang akan merilis pembaruan antarmuka mobile paling lambat awal bulan depan.
3. Dokumentasi standar operasional prosedur (SOP) telah diselaraskan ke dalam format terstandar.
`,
  jurnal_artikel: `IMPLEMENTASI OTOMATISASI DOKUMEN BERBASIS OOXML UNTUK MENINGKATKAN EFISIENSI ADMINISTRASI AKADEMIK
Andi Pratama, Budi Santoso — Fakultas Teknologi Informasi, Universitas Semarang

ABSTRAK
Pengelolaan format dokumen akademik sering kali memakan waktu karena ketidakkonsistenan margin, jenis huruf, spasi baris, dan penomoran halaman. Penelitian ini merancang mesin pemformatan dokumen OOXML otomatis berbasis FastAPI dan Next.js. Hasil pengujian menunjukkan pengurangan waktu penyesuaian format hingga 85% tanpa mengubah isi dokumen asli.

PENDAHULUAN
Dokumen Microsoft Word (.docx) menjadi standar utama dalam pelaporan akademik dan perkantoran. Namun, penyusunan dokumen secara manual sering memicu kesalahan struktur heading dan daftar isi.

METODE PENELITIAN
Sistem dibangun menggunakan arsitektur klien-server dengan memanipulasi langsung elemen XML OOXML seperti sectPr, pgNumType, dan field TOC melalui pustaka python-docx dan lxml.

HASIL DAN PEMBAHASAN
Pengujian pada berbagai jenis dokumen membuktikan bahwa pemisahan Section Break Romawi dan Arab dapat diotomatisasi dengan akurasi tinggi dan tetap editable 100% di Microsoft Word.

KESIMPULAN
Pendekatan manipulasi OOXML asli terbukti efektif untuk menyelaraskan dokumen mentah maupun file .docx berantakan sesuai pedoman penulisan standar.

DAFTAR PUSTAKA
Pratama, A., & Santoso, B. (2026). Otomatisasi Dokumen Ilmiah Berbasis Web. Jurnal Sistem Informasi Indonesia, 8(2), 112-124.
`,
};
