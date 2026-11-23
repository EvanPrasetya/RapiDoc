"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  ArrowRight,
  Check,
  ShieldCheck,
  Sliders,
  BookOpen,
  GraduationCap,
  Briefcase,
  Mail,
  UserCheck,
  Sparkles,
  FileCheck2,
  Layers,
  Award,
  FileSignature,
  ClipboardList,
  Newspaper,
} from "lucide-react";
import { INITIAL_PRESETS } from "@/lib/sampleData";

export default function LandingPage() {
  const getPresetIcon = (id: string) => {
    switch (id) {
      case "makalah":
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case "skripsi":
        return <GraduationCap className="h-4 w-4 text-blue-600" />;
      case "laporan_magang":
        return <Award className="h-4 w-4 text-blue-600" />;
      case "proposal":
        return <Briefcase className="h-4 w-4 text-blue-600" />;
      case "surat_resmi":
        return <Mail className="h-4 w-4 text-blue-600" />;
      case "cv_ats":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case "surat_lamaran":
        return <FileSignature className="h-4 w-4 text-blue-600" />;
      case "laporan_kerja":
        return <ClipboardList className="h-4 w-4 text-blue-600" />;
      case "jurnal_artikel":
        return <Newspaper className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
                RapiDoc
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                Smart Document Formatter
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#cara-kerja" className="hover:text-slate-900 transition">
              Cara Kerja
            </a>
            <a href="#multi-dokumen" className="hover:text-slate-900 transition">
              Template Dokumen
            </a>
            <a href="#keunggulan" className="hover:text-slate-900 transition">
              Keunggulan OOXML
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <span>Buka workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-14 sm:px-6 sm:pt-20 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-subtle mb-7">
            <Sliders className="h-3.5 w-3.5 text-blue-600" />
            <span>Pemrosesan DOCX nyata — bukan mockup</span>
          </div>

          <h1 className="mx-auto max-w-3xl text-3xl sm:text-5xl md:text-[54px] font-extrabold tracking-tight text-slate-950 leading-[1.12]">
            Rapikan format dokumen otomatis{" "}
            <span className="text-blue-600">tanpa mengorbankan isinya.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
            RapiDoc memeriksa dan merapikan dokumen Word (.docx) serta teks/Markdown
            sesuai pedoman format. Margin, font, spasi, heading, penomoran halaman
            Romawi &amp; Arab, hingga daftar isi — langsung di file DOCX Anda.
          </p>

          {/* Main CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto sm:max-w-none">
            <Link
              href="/workspace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <span>Buka Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#cara-kerja"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 shadow-subtle transition hover:bg-slate-50"
            >
              Lihat Cara Kerjanya
            </a>
          </div>

          {/* Trust micro-badges */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-blue-600" />
              Maks. 20 MB
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-blue-600" />
              Privasi terjaga (tidak untuk training AI)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-blue-600" />
              Tetap 100% editable di Word
            </span>
          </div>

          {/* Browser Window Live Document Preview Card */}
          <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-paper text-left">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              </div>
              <div className="rounded-md border border-slate-200/80 bg-white px-3 py-1 text-[11px] text-slate-400 font-mono truncate max-w-[260px] sm:max-w-md">
                rapidoc.app/workspace/kehidupan-manusia-makalah.docx
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Siap diunduh
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 bg-slate-100/70">
              {/* Simulated A4 Paper Sheet */}
              <div className="lg:col-span-8 p-5 sm:p-8 flex justify-center">
                <div className="w-full max-w-lg rounded-sm border border-slate-200 bg-white p-7 sm:p-10 shadow-sm doc-font-times text-slate-900">
                  <p className="text-center text-xs font-bold tracking-wide uppercase text-slate-900">
                    ANALISIS SISTEM INFORMASI AKADEMIK
                  </p>
                  <div className="mt-5 text-center">
                    <p className="text-sm font-bold">BAB I</p>
                    <p className="text-sm font-bold">PENDAHULUAN</p>
                  </div>
                  <p className="mt-5 text-xs font-bold">1.1 Latar Belakang</p>
                  <p className="mt-2 text-xs leading-[1.8] text-justify indent-7 text-slate-800">
                    Perkembangan teknologi informasi di lingkungan perguruan tinggi
                    menuntut pengelolaan dokumen akademik yang terstandarisasi.
                    Konsistensi margin 4-4-3-3 cm, tipografi Times New Roman 12 pt,
                    serta struktur penomoran halaman Romawi dan Arab menjadi bagian
                    penting dalam karya tulis ilmiah.
                  </p>
                  <p className="mt-3 text-xs font-bold">1.2 Rumusan Masalah</p>
                  <ol className="mt-1.5 list-decimal list-inside text-xs leading-[1.75] text-slate-800 space-y-1">
                    <li>Bagaimana mengotomatisasi pemeriksaan format dokumen Word?</li>
                    <li>Bagaimana menyisipkan Section Break &amp; Daftar Isi OOXML asli?</li>
                  </ol>
                  <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-500">
                    1
                  </div>
                </div>
              </div>

              {/* Simulated Audit & Formatting Summary */}
              <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200/80 bg-white p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Aturan Diterapkan
                    </span>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      12 / 12 Aktif
                    </span>
                  </div>
                  <ul className="mt-3.5 space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Margin A4 (4-4-3-3 cm / 4-3-3-3 cm)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Times New Roman 12 pt, Spasi 1,5</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Section Break Romawi (i, ii) &amp; Arab (1, 2)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Word TOC Field (Daftar Isi Otomatis)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>Cover Kampus &amp; Kata Pengantar Otomatis</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href="/workspace"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <span>Coba di Workspace Sekarang</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Highlight Keunggulan Section */}
        <section id="keunggulan" className="border-y border-slate-200/80 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                MENGAPA RAPIDOC
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Dibangun di atas mesin OOXML asli untuk hasil yang presisi.
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  Pemrosesan DOCX Asli (100% Editable)
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Bukan sekadar konversi PDF statis. RapiDoc memanipulasi struktur XML
                  Word (<code className="text-xs bg-slate-200/70 px-1 py-0.5 rounded">w:sectPr</code>,{" "}
                  <code className="text-xs bg-slate-200/70 px-1 py-0.5 rounded">w:rFonts</code>,{" "}
                  <code className="text-xs bg-slate-200/70 px-1 py-0.5 rounded">TOC Field</code>) sehingga
                  file hasil unduhan tetap 100% bisa diedit di Microsoft Word.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  Multi-Dokumen &amp; Konversi Markdown AI
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Mendukung unggah file <code className="text-xs bg-slate-200/70 px-1 py-0.5 rounded">.docx</code>{" "}
                  maupun tempel teks/Markdown mentah dari ChatGPT atau Claude. Lengkap
                  dengan preset Makalah, Skripsi, Proposal, Surat Resmi, dan CV ATS.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  Audit Format Per Paragraf &amp; Privasi Terjaga
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Deteksi pelanggaran format secara transparan di setiap paragraf sebelum
                  dirapikan. Dokumen Anda diproses di memori sesi dan tidak pernah
                  digunakan untuk pelatihan model AI.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Multi-Document Templates Section */}
        <section id="multi-dokumen" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                STANDAR PEDOMAN
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Preset Template Siap Pakai &amp; Kustomisasi Penuh
              </h2>
            </div>
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Kelola template di Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INITIAL_PRESETS.map((preset) => (
              <Link
                key={preset.id}
                href={`/workspace?preset=${preset.id}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle transition hover:border-blue-400 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                      {getPresetIcon(preset.id)}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                      {preset.category}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {preset.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5">
                    Margin {preset.margin_label}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5">
                    {preset.font_name} {preset.font_size_pt}pt
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5">
                    Spasi {preset.line_spacing}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cara Kerja Section */}
        <section id="cara-kerja" className="border-t border-slate-200/80 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                ALUR KERJA
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Tiga langkah menuju dokumen siap cetak &amp; kumpul
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 p-6">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  1
                </span>
                <h3 className="mt-3.5 text-base font-bold text-slate-900">
                  Unggah DOCX atau Tempel Markdown
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tarik file <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">.docx</code> Anda
                  untuk divalidasi struktur ZIP &amp; OOXML-nya, atau tempel draf teks/Markdown
                  dari AI langsung ke editor.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  2
                </span>
                <h3 className="mt-3.5 text-base font-bold text-slate-900">
                  Audit Pelanggaran &amp; Pilih 12 Aturan
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Periksa daftar temuan format per paragraf, atur Cover/Kop Surat beserta
                  logo instansi, dan centang aturan formatting yang ingin diterapkan.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  3
                </span>
                <h3 className="mt-3.5 text-base font-bold text-slate-900">
                  Pratinjau Halaman &amp; Unduh .DOCX
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tinjau hasil halaman demi halaman lengkap dengan nomor Romawi/Arab dan
                  Daftar Isi, lalu unduh file <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">.docx</code>{" "}
                  yang 100% editable.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#F8FAFC] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-800">RapiDoc</span>
            <span>— Smart Document Auto-Formatter</span>
          </div>
          <div>
            Pemrosesan OOXML Asli • Makalah • Skripsi • Proposal • Surat Resmi • CV ATS
          </div>
        </div>
      </footer>
    </div>
  );
}
