"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Sliders } from "lucide-react";
import { PresetTemplate } from "@/lib/sampleData";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: PresetTemplate;
  onSavePreset: (updated: Partial<PresetTemplate>) => Promise<void>;
}

export default function TemplateModal({
  isOpen,
  onClose,
  currentPreset,
  onSavePreset,
}: TemplateModalProps) {
  const [name, setName] = useState(currentPreset.name);
  const [fontName, setFontName] = useState(currentPreset.font_name);
  const [fontSizePt, setFontSizePt] = useState(currentPreset.font_size_pt);
  const [lineSpacing, setLineSpacing] = useState(currentPreset.line_spacing);
  const [firstIndentCm, setFirstIndentCm] = useState(currentPreset.first_line_indent_cm);
  const [alignment, setAlignment] = useState<"justify" | "left" | "center" | "right">(
    currentPreset.alignment
  );
  const [marginTop, setMarginTop] = useState(currentPreset.margin_top_cm);
  const [marginBottom, setMarginBottom] = useState(currentPreset.margin_bottom_cm);
  const [marginLeft, setMarginLeft] = useState(currentPreset.margin_left_cm);
  const [marginRight, setMarginRight] = useState(currentPreset.margin_right_cm);
  const [h1Size, setH1Size] = useState(currentPreset.h1_size_pt);
  const [h2Size, setH2Size] = useState(currentPreset.h2_size_pt);
  const [chapterBreak, setChapterBreak] = useState(currentPreset.chapter_page_break);
  const [romanFront, setRomanFront] = useState(currentPreset.use_roman_front_matter);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentPreset) {
      setName(currentPreset.name);
      setFontName(currentPreset.font_name);
      setFontSizePt(currentPreset.font_size_pt);
      setLineSpacing(currentPreset.line_spacing);
      setFirstIndentCm(currentPreset.first_line_indent_cm);
      setAlignment(currentPreset.alignment);
      setMarginTop(currentPreset.margin_top_cm);
      setMarginBottom(currentPreset.margin_bottom_cm);
      setMarginLeft(currentPreset.margin_left_cm);
      setMarginRight(currentPreset.margin_right_cm);
      setH1Size(currentPreset.h1_size_pt);
      setH2Size(currentPreset.h2_size_pt);
      setChapterBreak(currentPreset.chapter_page_break);
      setRomanFront(currentPreset.use_roman_front_matter);
    }
  }, [currentPreset, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSavePreset({
        id: currentPreset.is_custom ? currentPreset.id : `custom_${Date.now()}`,
        name: name.trim() || "Template Custom",
        short_name: (name.trim() || "Custom").slice(0, 22),
        category: "Custom",
        description: `A4, margin ${marginTop}-${marginLeft}-${marginBottom}-${marginRight} cm, ${fontName} ${fontSizePt} pt, spasi ${lineSpacing}.`,
        font_name: fontName,
        font_size_pt: Number(fontSizePt),
        line_spacing: Number(lineSpacing),
        first_line_indent_cm: Number(firstIndentCm),
        alignment,
        margin_top_cm: Number(marginTop),
        margin_bottom_cm: Number(marginBottom),
        margin_left_cm: Number(marginLeft),
        margin_right_cm: Number(marginRight),
        h1_size_pt: Number(h1Size),
        h2_size_pt: Number(h2Size),
        chapter_page_break: chapterBreak,
        use_roman_front_matter: romanFront,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Kelola Template Pedoman
              </h3>
              <p className="text-xs text-slate-500">
                Sesuaikan aturan margin, font, spasi, dan penomoran custom
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[78vh] overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nama Template Pedoman
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              placeholder="Contoh: Pedoman Skripsi UNNES 2026"
              required
            />
          </div>

          {/* Margins 4 sides */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Margin Halaman A4 (cm)
            </label>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Atas (Top)</span>
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  max="6"
                  value={marginTop}
                  onChange={(e) => setMarginTop(parseFloat(e.target.value) || 3)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Kiri (Left)</span>
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  max="6"
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(parseFloat(e.target.value) || 3)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Bawah (Bottom)</span>
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  max="6"
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(parseFloat(e.target.value) || 3)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">Kanan (Right)</span>
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  max="6"
                  value={marginRight}
                  onChange={(e) => setMarginRight(parseFloat(e.target.value) || 3)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Font & Size */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Jenis Font Utama
              </label>
              <select
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="Times New Roman">Times New Roman</option>
                <option value="Calibri">Calibri</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Cambria">Cambria</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ukuran Font Isi (pt)
              </label>
              <input
                type="number"
                step="0.5"
                min="8"
                max="16"
                value={fontSizePt}
                onChange={(e) => setFontSizePt(parseFloat(e.target.value) || 12)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Line Spacing, First line indent, Alignment */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Spasi Baris
              </label>
              <select
                value={lineSpacing}
                onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value={1.0}>1.0 (Tunggal)</option>
                <option value={1.15}>1.15</option>
                <option value={1.5}>1.5 (Standar)</option>
                <option value={2.0}>2.0 (Ganda)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Indentasi Paragraf (cm)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="3"
                value={firstIndentCm}
                onChange={(e) => setFirstIndentCm(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Perataan Teks
              </label>
              <select
                value={alignment}
                onChange={(e) =>
                  setAlignment(e.target.value as "justify" | "left" | "center" | "right")
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="justify">Justify (Kanan-Kiri)</option>
                <option value="left">Rata Kiri</option>
                <option value="center">Rata Tengah</option>
              </select>
            </div>
          </div>

          {/* Heading sizes */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ukuran Heading BAB (pt)
              </label>
              <input
                type="number"
                step="0.5"
                min="10"
                max="20"
                value={h1Size}
                onChange={(e) => setH1Size(parseFloat(e.target.value) || 14)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Ukuran Subbab (pt)
              </label>
              <input
                type="number"
                step="0.5"
                min="10"
                max="18"
                value={h2Size}
                onChange={(e) => setH2Size(parseFloat(e.target.value) || 12)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={chapterBreak}
                onChange={(e) => setChapterBreak(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Mulai setiap BAB baru di halaman baru (Page Break)
              </span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={romanFront}
                onChange={(e) => setRomanFront(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Pisahkan Section nomor halaman Romawi (i, ii) & Arab (1, 2)
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? "Menyimpan..." : "Simpan Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
