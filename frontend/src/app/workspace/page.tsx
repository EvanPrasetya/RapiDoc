"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Upload,
  CloudUpload,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCw,
  Sliders,
  Check,
  AlertTriangle,
  Info,
  Download,
  Menu,
  X,
  Settings2,
  Sparkles,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  History,
  MoreHorizontal,
  Eye,
  Pencil,
  Save,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Indent,
  Outdent,
  Palette,
  Highlighter,
  RemoveFormatting,
  CaseSensitive,
  Trash2,
  Type,
  Move,
  PanelRightClose,
  PanelRight,
  Printer,
  FileCode,
} from "lucide-react";
import {
  INITIAL_PRESETS,
  FORMATTING_RULES_META,
  SAMPLE_MAKALAH_MARKDOWN,
  SAMPLE_TEXT_BY_PRESET,
  PresetTemplate,
} from "@/lib/sampleData";
import {
  checkBackendHealthApi,
  fetchPresets,
  saveCustomPresetApi,
  uploadDocxApi,
  createFromMarkdownApi,
  formatDocumentApi,
  updateDocumentContentApi,
  getDownloadDocxUrl,
  WorkspaceDocumentResponse,
  PreviewPage,
  PreviewBlock,
} from "@/lib/api";
import TemplateModal from "@/components/TemplateModal";
import DocxClientRenderer from "@/components/DocxClientRenderer";

interface BlockStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  font_name?: string;
  size_pt?: number;
  align?: "left" | "center" | "right" | "justify";
  line_spacing?: number;
  indent_cm?: number;
  color?: string;
  highlight?: string;
  html?: string;
  image_base64?: string;
  image_width_cm?: number;
  delete?: boolean;
}

interface AutoResizeTextareaProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  isModified?: boolean;
  ariaLabel?: string;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  forwardedRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function AutoResizeTextarea({
  value,
  onChange,
  className = "",
  style,
  isModified = false,
  ariaLabel,
  onFocus,
  onKeyDown,
  forwardedRef,
}: AutoResizeTextareaProps) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = forwardedRef || localRef;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, ref]);

  return (
    <textarea
      ref={ref as React.RefObject<HTMLTextAreaElement>}
      rows={1}
      value={value}
      aria-label={ariaLabel}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      className={`w-full resize-none overflow-hidden rounded border px-1.5 py-0.5 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-blue-50/30 transition ${isModified
        ? "border-amber-400 bg-amber-50/30"
        : "border-dashed border-blue-300/70 hover:border-blue-500"
        } ${className}`}
    />
  );
}

interface WordRichEditorBlockProps {
  pIdx: number;
  value: string;
  isModified?: boolean;
  blockStyle?: BlockStyle;
  isActive?: boolean;
  onFocus: (el: HTMLTextAreaElement | null) => void;
  onChange: (val: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onInsertImage?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  placeholder?: string;
}

function WordRichEditorBlock({
  pIdx,
  value,
  isModified = false,
  blockStyle = {},
  isActive = false,
  onFocus,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onInsertImage,
  canMoveUp = true,
  canMoveDown = true,
  className = "",
  style,
  ariaLabel,
  placeholder,
}: WordRichEditorBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If empty and user hits Backspace or Delete, trigger delete block to eliminate the gap
    if ((e.key === "Backspace" || e.key === "Delete") && (!value || value.trim() === "") && onDelete) {
      e.preventDefault();
      onDelete();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const key = e.key.toLowerCase();
      const el = textareaRef.current;
      if (!el) return;
      if (key === "b") {
        e.preventDefault();
        const s = el.selectionStart;
        const en = el.selectionEnd;
        const sel = el.value.substring(s, en);
        const next = el.value.substring(0, s) + "<b>" + (sel || "teks") + "</b>" + el.value.substring(en);
        el.value = next;
        onChange(next);
        setTimeout(() => el.setSelectionRange(s + 3, en + 3), 0);
      } else if (key === "i") {
        e.preventDefault();
        const s = el.selectionStart;
        const en = el.selectionEnd;
        const sel = el.value.substring(s, en);
        const next = el.value.substring(0, s) + "<i>" + (sel || "teks") + "</i>" + el.value.substring(en);
        el.value = next;
        onChange(next);
        setTimeout(() => el.setSelectionRange(s + 3, en + 3), 0);
      } else if (key === "u") {
        e.preventDefault();
        const s = el.selectionStart;
        const en = el.selectionEnd;
        const sel = el.value.substring(s, en);
        const next = el.value.substring(0, s) + "<u>" + (sel || "teks") + "</u>" + el.value.substring(en);
        el.value = next;
        onChange(next);
        setTimeout(() => el.setSelectionRange(s + 3, en + 3), 0);
      }
    }
  };

  const dynamicStyles: React.CSSProperties = {
    ...style,
    textAlign: blockStyle.align || style?.textAlign,
    fontFamily: blockStyle.font_name || style?.fontFamily,
    fontSize: blockStyle.size_pt ? `${blockStyle.size_pt}pt` : style?.fontSize,
    fontWeight: blockStyle.bold !== undefined ? (blockStyle.bold ? "bold" : "normal") : style?.fontWeight,
    fontStyle: blockStyle.italic !== undefined ? (blockStyle.italic ? "italic" : "normal") : style?.fontStyle,
    textDecoration: blockStyle.underline
      ? "underline"
      : blockStyle.strike
        ? "line-through"
        : style?.textDecoration,
    color: blockStyle.color || style?.color,
    backgroundColor: blockStyle.highlight || style?.backgroundColor,
    lineHeight: blockStyle.line_spacing ? `${blockStyle.line_spacing * 1.25}` : style?.lineHeight,
  };

  const isEmpty = !value || value.trim() === "";

  return (
    <div
      className="relative group/rich-block w-full transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder || (isEmpty ? "[Baris kosong — Klik ikon 🗑️ untuk menghapus celah ini, atau ketik teks]" : undefined)}
        onFocus={() => onFocus(textareaRef.current)}
        onKeyDown={handleKeyDown}
        onChange={(e) => onChange(e.target.value)}
        style={dynamicStyles}
        className={`w-full resize-none overflow-hidden rounded px-2 py-1 transition focus:outline-none ${isActive
          ? "border-2 border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20"
          : isModified
            ? "border border-amber-400 bg-amber-50/30"
            : isEmpty
              ? "border border-dashed border-amber-300 bg-amber-50/20 hover:border-amber-400 text-slate-400 italic text-xs"
              : "border border-dashed border-blue-300/70 hover:border-blue-400"
          } ${className}`}
      />

      {/* Floating Action Bar for Moving Up/Down, Deleting, and Adding Image */}
      {(isActive || isHovered) && (
        <div className="absolute -top-3.5 right-1 z-30 flex items-center gap-0.5 rounded-md border border-blue-200 bg-white px-1.5 py-0.5 shadow-md">
          <span className="text-[9px] font-bold text-blue-700 mr-1 select-none">
            #{pIdx}
          </span>
          {onMoveUp && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={!canMoveUp}
              className="rounded p-0.5 text-slate-600 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-30 transition"
              title="Geser ke Atas (Pindahkan baris ini naik ke ruang kosong di atasnya)"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={!canMoveDown}
              className="rounded p-0.5 text-slate-600 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-30 transition"
              title="Geser ke Bawah (Pindahkan baris ini turun)"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
          {onInsertImage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInsertImage();
              }}
              className="rounded p-0.5 text-blue-600 hover:bg-blue-50 transition"
              title="Ganti teks ini dengan gambar / Sisipkan gambar"
            >
              <ImageIcon className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded p-0.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
              title={isEmpty ? "Hapus celah kosong ini (rapatkan konten ke atas)" : "Hapus baris/paragraf ini"}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const initialPresetParam = searchParams.get("preset") || "makalah";

  // Navigation mode: "input" (Halaman Input Dokumen Baru) vs "editor" (Halaman Workspace Split View / Drawer)
  const [viewMode, setViewMode] = useState<"input" | "editor">("input");
  const [inputTab, setInputTab] = useState<"upload" | "paste">("upload");

  // Presets & Custom Template Modal
  const [presets, setPresets] = useState<PresetTemplate[]>(INITIAL_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetParam);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Input state
  const [markdownText, setMarkdownText] = useState<string>("");
  const [activeRawMarkdown, setActiveRawMarkdown] = useState<string | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Active Document in Workspace
  const [activeDoc, setActiveDoc] = useState<WorkspaceDocumentResponse | null>(null);
  const [historyDocs, setHistoryDocs] = useState<WorkspaceDocumentResponse[]>([]);
  const [showHistoryList, setShowHistoryList] = useState(false);

  // Workspace Panel state (Sidebar on Desktop / Slide-over Drawer on Mobile)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"formatting" | "audit">("formatting");
  const [auditFilter, setAuditFilter] = useState<string>("all");

  // 12 Formatting Rules Checkboxes
  const [rules, setRules] = useState<Record<string, boolean>>({
    margins: true,
    font_family: true,
    font_size: true,
    line_spacing: true,
    indentation: true,
    alignment: true,
    headings: true,
    paragraph_spacing: true,
    page_numbering: true,
    toc: true,
    auto_cover: true,
    extra_pages: true,
  });

  // Expandable Cover / Kop Surat Form state
  const [showCoverForm, setShowCoverForm] = useState(false);
  const [coverData, setCoverData] = useState<Record<string, string>>({
    doc_label: "MAKALAH",
    title: "KEHIDUPAN MANUSIA: HAKIKAT, PERKEMBANGAN, DAN TANTANGANNYA",
    course: "FISIKA",
    lecturer: "Syahroni Hidayat S.T., M.Eng.",
    author: "MUHAMMAD FAHRI FIRDAUSSILLAH",
    nim: "2605090003",
    study_program: "PENDIDIKAN TEKNIK INFORMATIKA DAN KOMPUTER",
    department: "DEPARTEMEN TEKNIK ELEKTRO",
    faculty: "FAKULTAS TEKNIK",
    institution: "UNIVERSITAS NEGERI SEMARANG",
    city: "SEMARANG",
    year: "2026",
    logo_base64: "",
    logo_width_cm: "3.8",
    logo_align: "center",
    logo_margin_top_pt: "8",
  });

  // Document Previewer state (Page navigation, Zoom, Scroll vs Single Page vs Client DOCX Preview, Toast)
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(95);
  const [previewRenderMode, setPreviewRenderMode] = useState<"paginated" | "scroll" | "docx_preview">("paginated");
  const [docxRefreshCount, setDocxRefreshCount] = useState(0);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [toastBanner, setToastBanner] = useState<{
    title: string;
    subtitle: string;
    visible: boolean;
  } | null>(null);

  // Live Inline Web Editor state & Word Ribbon Formatting state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedParagraphs, setEditedParagraphs] = useState<Record<number, string>>({});
  const [editedStyles, setEditedStyles] = useState<Record<number, BlockStyle>>({});
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [editedTables, setEditedTables] = useState<Record<number, string[][]>>({});
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  // Track structural modifications (moving blocks, deleting paragraphs, adding pages)
  const [deletedParagraphIndices, setDeletedParagraphIndices] = useState<number[]>([]);
  const [hasStructuralChanges, setHasStructuralChanges] = useState<boolean>(false);
  const [reorderedPIndices, setReorderedPIndices] = useState<number[]>([]);
  const blockImageInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageTargetRef = useRef<{ pageNum: number; blockIdx: number; replace: boolean } | null>(null);

  // Spacious workspace state & Multi-format download dropdown
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(e.target as Node)
      ) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  const unsavedEditCount =
    Object.keys(editedParagraphs).length +
    Object.keys(editedTables).length +
    deletedParagraphIndices.length +
    (hasStructuralChanges ? 1 : 0);
  const hasUnsavedEdits = unsavedEditCount > 0;

  const checkHealthAndPresets = () => {
    checkBackendHealthApi().then((ok) => setBackendOnline(ok));
    fetchPresets().then((list) => {
      if (list && list.length > 0) setPresets(list);
    });
  };

  useEffect(() => {
    checkHealthAndPresets();
  }, []);

  // Responsiveness: auto-fit A4 page zoom on mobile viewports (< 640px)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      const fitZoom = Math.max(50, Math.min(85, Math.floor(((window.innerWidth - 24) / 680) * 100)));
      setZoomPercent(fitZoom);
    }
  }, []);

  useEffect(() => {
    if (initialPresetParam && presets.some((p) => p.id === initialPresetParam)) {
      setSelectedPresetId(initialPresetParam);
    }
  }, [initialPresetParam, presets]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (viewMode !== "editor" || previewRenderMode !== "scroll") return;
    const timer = setTimeout(() => {
      const container = previewScrollRef.current;
      const el = pageRefs.current[currentPage];
      if (!container || !el) return;
      isProgrammaticScrollRef.current = true;
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const nextTop = container.scrollTop + (eRect.top - cRect.top) - 20;
      container.scrollTo({ top: Math.max(0, nextTop), behavior: "auto" });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 150);
    }, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewRenderMode, viewMode]);

  const currentPreset =
    presets.find((p) => p.id === selectedPresetId) || presets[0] || INITIAL_PRESETS[0];

  const activeRulesCount = Object.values(rules).filter(Boolean).length;

  const triggerToast = (title: string, subtitle: string) => {
    setToastBanner({ title, subtitle, visible: true });
    setTimeout(() => {
      setToastBanner((prev) => (prev ? { ...prev, visible: false } : null));
    }, 5500);
  };

  const openDocumentInWorkspace = (docResp: WorkspaceDocumentResponse) => {
    setActiveDoc(docResp);
    setHistoryDocs((prev) => [
      docResp,
      ...prev.filter((d) => d.doc_id !== docResp.doc_id),
    ]);
    // Synchronize cover form with the newly uploaded/created document's extracted metadata
    // while preserving any custom logo the user already picked
    const meta = docResp.extracted_meta || {};
    setCoverData((prev) => ({
      doc_label: meta.doc_label || "MAKALAH",
      title: meta.title || "",
      course: meta.course || "",
      lecturer: meta.lecturer || "",
      author: meta.author || "",
      nim: meta.nim || "",
      study_program: meta.study_program || "",
      department: meta.department || "",
      faculty: meta.faculty || "",
      institution: meta.institution || "",
      city: meta.city || "SEMARANG",
      year: meta.year || "2026",
      logo_base64: prev.logo_base64 || meta.extracted_logo_base64 || "",
      logo_width_cm: prev.logo_width_cm || meta.logo_width_cm || "3.8",
      logo_align: prev.logo_align || meta.logo_align || "center",
      logo_margin_top_pt: prev.logo_margin_top_pt || meta.logo_margin_top_pt || "8",
    }));
    setEditedParagraphs({});
    setEditedStyles({});
    setActiveBlockIndex(null);
    setEditedTables({});
    setIsEditMode(false);
    setCurrentPage(1);
    setViewMode("editor");
    triggerToast(
      "Pemeriksaan selesai",
      `${docResp.analysis.total_findings} temuan format terdeteksi`
    );
  };

  // Handler: Upload .DOCX file
  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".doc")) {
      setErrorMsg(
        "Format .doc (Word lama 97-2003) belum didukung. Silakan buka di Microsoft Word atau Google Docs lalu pilih Save As / Unduh sebagai .docx."
      );
      return;
    }
    if (!lowerName.endsWith(".docx")) {
      setErrorMsg("Format file tidak didukung. Harap pilih file Microsoft Word (.docx).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Ukuran file melebihi batas maksimum 20 MB.");
      return;
    }
    setIsLoading(true);
    try {
      setActiveRawMarkdown(undefined);
      const resp = await uploadDocxApi(file, selectedPresetId);
      openDocumentInWorkspace(resp);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengunggah dokumen DOCX");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Create Document from Pasted Text / Markdown
  const handleCreateFromMarkdown = async () => {
    setErrorMsg(null);
    if (!markdownText.trim()) {
      setErrorMsg("Silakan tempel teks atau Markdown terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    try {
      setActiveRawMarkdown(markdownText);
      const resp = await createFromMarkdownApi(
        markdownText,
        selectedPresetId,
        undefined,
        currentPreset
      );
      openDocumentInWorkspace(resp);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal membuat dokumen dari teks");
    } finally {
      setIsLoading(false);
    }
  };

  // Live Inline Edit helpers & Save to OOXML .DOCX
  const getEditableParagraphText = (b: PreviewBlock): string => {
    if (b.p_idx !== undefined && editedParagraphs[b.p_idx] !== undefined) {
      return editedParagraphs[b.p_idx];
    }
    return b.text || "";
  };

  const getEditableTableRows = (b: PreviewBlock): string[][] => {
    if (b.table_idx !== undefined && editedTables[b.table_idx] !== undefined) {
      return editedTables[b.table_idx];
    }
    return b.rows || [];
  };

  const handleParagraphEdit = (
    pIdx: number,
    originalText: string,
    newText: string
  ) => {
    setEditedParagraphs((prev) => {
      if (newText === originalText) {
        if (!(pIdx in prev)) return prev;
        const copy = { ...prev };
        delete copy[pIdx];
        return copy;
      }
      return { ...prev, [pIdx]: newText };
    });
  };

  const handleTableCellEdit = (
    tableIdx: number,
    originalRows: string[][],
    rowIdx: number,
    colIdx: number,
    newVal: string
  ) => {
    setEditedTables((prev) => {
      const base = prev[tableIdx] || originalRows;
      const nextRows = base.map((r, rI) =>
        rI === rowIdx ? r.map((c, cI) => (cI === colIdx ? newVal : c)) : [...r]
      );
      const isIdentical =
        nextRows.length === originalRows.length &&
        nextRows.every((r, rI) =>
          r.every((c, cI) => c === (originalRows[rI]?.[cI] ?? ""))
        );
      if (isIdentical) {
        if (!(tableIdx in prev)) return prev;
        const copy = { ...prev };
        delete copy[tableIdx];
        return copy;
      }
      return { ...prev, [tableIdx]: nextRows };
    });
  };

  const handleApplyFormatting = (
    type: "bold" | "italic" | "underline" | "strike" | "color" | "highlight",
    value?: string
  ) => {
    if (activeBlockIndex === null) return;
    const el = activeTextareaRef.current;
    if (el) {
      let prefix = "";
      let suffix = "";
      if (type === "bold") {
        prefix = "<b>";
        suffix = "</b>";
      } else if (type === "italic") {
        prefix = "<i>";
        suffix = "</i>";
      } else if (type === "underline") {
        prefix = "<u>";
        suffix = "</u>";
      } else if (type === "strike") {
        prefix = "<s>";
        suffix = "</s>";
      } else if (type === "color" && value) {
        prefix = `<span style="color:${value}">`;
        suffix = "</span>";
      } else if (type === "highlight" && value) {
        prefix = `<span style="background-color:${value}">`;
        suffix = "</span>";
      }

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const curVal = el.value;
      if (start !== end) {
        const selected = curVal.substring(start, end);
        const nextVal =
          curVal.substring(0, start) +
          prefix +
          selected +
          suffix +
          curVal.substring(end);
        el.value = nextVal;
        handleParagraphEdit(activeBlockIndex, curVal, nextVal);
        setTimeout(() => {
          el.focus();
          el.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
        return;
      }
    }
    setEditedStyles((prev) => {
      const cur = prev[activeBlockIndex] || {};
      if (type === "bold") return { ...prev, [activeBlockIndex]: { ...cur, bold: !cur.bold } };
      if (type === "italic") return { ...prev, [activeBlockIndex]: { ...cur, italic: !cur.italic } };
      if (type === "underline") return { ...prev, [activeBlockIndex]: { ...cur, underline: !cur.underline } };
      if (type === "strike") return { ...prev, [activeBlockIndex]: { ...cur, strike: !cur.strike } };
      if (type === "color") return { ...prev, [activeBlockIndex]: { ...cur, color: value } };
      if (type === "highlight") return { ...prev, [activeBlockIndex]: { ...cur, highlight: value } };
      return prev;
    });
  };

  const handleApplyAlignment = (align: "left" | "center" | "right" | "justify") => {
    if (activeBlockIndex === null) return;
    setEditedStyles((prev) => ({
      ...prev,
      [activeBlockIndex]: { ...(prev[activeBlockIndex] || {}), align },
    }));
  };

  const handleApplyFontFamily = (font_name: string) => {
    if (activeBlockIndex === null) return;
    setEditedStyles((prev) => ({
      ...prev,
      [activeBlockIndex]: { ...(prev[activeBlockIndex] || {}), font_name },
    }));
  };

  const handleApplyFontSize = (size_pt: number) => {
    if (activeBlockIndex === null) return;
    setEditedStyles((prev) => ({
      ...prev,
      [activeBlockIndex]: { ...(prev[activeBlockIndex] || {}), size_pt },
    }));
  };

  const handleApplyLineSpacing = (line_spacing: number) => {
    if (activeBlockIndex === null) return;
    setEditedStyles((prev) => ({
      ...prev,
      [activeBlockIndex]: { ...(prev[activeBlockIndex] || {}), line_spacing },
    }));
  };

  const handleChangeCase = (mode: "upper" | "lower" | "title") => {
    if (activeBlockIndex === null) return;
    const el = activeTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const hasSelection = start !== end;
    const target = hasSelection ? val.substring(start, end) : val;
    let converted = target;
    if (mode === "upper") converted = target.toUpperCase();
    else if (mode === "lower") converted = target.toLowerCase();
    else if (mode === "title") converted = target.replace(/\b\w/g, (c) => c.toUpperCase());

    const nextVal = hasSelection
      ? val.substring(0, start) + converted + val.substring(end)
      : converted;
    el.value = nextVal;
    handleParagraphEdit(activeBlockIndex, val, nextVal);
  };

  const handleClearBlockFormat = () => {
    if (activeBlockIndex === null) return;
    const el = activeTextareaRef.current;
    if (el) {
      const clean = el.value.replace(/<\/?[^>]+(>|$)/g, "");
      el.value = clean;
      handleParagraphEdit(activeBlockIndex, el.value, clean);
    }
    setEditedStyles((prev) => {
      const copy = { ...prev };
      delete copy[activeBlockIndex];
      return copy;
    });
  };

  // Helper to re-save pages directly in activeDoc state
  const mutateActiveDocPages = (
    updater: (pages: PreviewPage[]) => PreviewPage[],
    toastTitle?: string,
    toastMsg?: string
  ) => {
    if (!activeDoc) return;
    const currentPages = activeDoc.analysis.pages || [];
    const nextPages = updater(JSON.parse(JSON.stringify(currentPages)));
    setActiveDoc({
      ...activeDoc,
      analysis: {
        ...activeDoc.analysis,
        pages: nextPages,
        stats: {
          ...activeDoc.analysis.stats,
          estimated_pages: nextPages.length,
        },
      },
    });
    setHasStructuralChanges(true);
    if (toastTitle) {
      triggerToast(toastTitle, toastMsg || "");
    }
  };

  // Move block up (swap with previous block on page)
  const handleMoveBlockUp = (pageNumber: number, blockIndex: number) => {
    if (blockIndex <= 0) return;
    mutateActiveDocPages((pages) => {
      const page = pages.find((p) => p.page_number === pageNumber);
      if (!page || blockIndex <= 0 || blockIndex >= page.blocks.length) return pages;
      const prevBlock = page.blocks[blockIndex - 1];
      const curBlock = page.blocks[blockIndex];
      page.blocks[blockIndex - 1] = curBlock;
      page.blocks[blockIndex] = prevBlock;

      if (curBlock.p_idx !== undefined && prevBlock.p_idx !== undefined) {
        setReorderedPIndices((prev) => {
          const list = [...prev];
          if (!list.includes(curBlock.p_idx!)) list.push(curBlock.p_idx!);
          if (!list.includes(prevBlock.p_idx!)) list.push(prevBlock.p_idx!);
          return list;
        });
      }
      return pages;
    }, "Elemen Digeser ke Atas", "Konten dinaikkan menempati posisi kosong di atasnya.");
  };

  // Move block down (swap with next block on page)
  const handleMoveBlockDown = (pageNumber: number, blockIndex: number) => {
    mutateActiveDocPages((pages) => {
      const page = pages.find((p) => p.page_number === pageNumber);
      if (!page || blockIndex < 0 || blockIndex >= page.blocks.length - 1) return pages;
      const curBlock = page.blocks[blockIndex];
      const nextBlock = page.blocks[blockIndex + 1];
      page.blocks[blockIndex] = nextBlock;
      page.blocks[blockIndex + 1] = curBlock;

      if (curBlock.p_idx !== undefined && nextBlock.p_idx !== undefined) {
        setReorderedPIndices((prev) => {
          const list = [...prev];
          if (!list.includes(nextBlock.p_idx!)) list.push(nextBlock.p_idx!);
          if (!list.includes(curBlock.p_idx!)) list.push(curBlock.p_idx!);
          return list;
        });
      }
      return pages;
    }, "Elemen Digeser ke Bawah", "Konten diturunkan ke posisi berikutnya.");
  };

  // Delete block (remove empty line or unwanted paragraph)
  const handleDeleteBlock = (pageNumber: number, blockIndex: number) => {
    mutateActiveDocPages((pages) => {
      const page = pages.find((p) => p.page_number === pageNumber);
      if (!page || blockIndex < 0 || blockIndex >= page.blocks.length) return pages;
      const blk = page.blocks[blockIndex];
      if (blk.p_idx !== undefined) {
        setDeletedParagraphIndices((prev) => [...prev, blk.p_idx!]);
        setEditedParagraphs((prev) => {
          const n = { ...prev };
          delete n[blk.p_idx!];
          return n;
        });
      }
      page.blocks.splice(blockIndex, 1);
      return pages;
    }, "Elemen Dihapus", "Celah kosong telah dihapus sehingga konten di bawahnya langsung naik ke atas.");
  };

  // Update specific block property (like image size or alignment)
  const handleUpdateBlock = (
    pageNumber: number,
    blockIndex: number,
    patch: Partial<PreviewBlock>
  ) => {
    mutateActiveDocPages((pages) => {
      const page = pages.find((p) => p.page_number === pageNumber);
      if (!page || blockIndex < 0 || blockIndex >= page.blocks.length) return pages;
      page.blocks[blockIndex] = { ...page.blocks[blockIndex], ...patch };
      return pages;
    });
  };

  // Trigger Image File Picker for a specific block or active block
  const triggerBlockImagePicker = (
    pageNumber?: number,
    blockIndex?: number,
    replace = true
  ) => {
    const targetPage = pageNumber ?? safeCurrentPage;
    let targetIdx = blockIndex;
    if (targetIdx === undefined && activeBlockIndex !== null) {
      const p = activeDoc?.analysis.pages.find((pg) => pg.page_number === targetPage);
      if (p) {
        const found = p.blocks.findIndex((b) => b.p_idx === activeBlockIndex);
        if (found !== -1) targetIdx = found;
      }
    }
    if (targetIdx === undefined) targetIdx = 0;
    pendingImageTargetRef.current = { pageNum: targetPage, blockIdx: targetIdx, replace };
    blockImageInputRef.current?.click();
  };

  // Handle Image File Selected
  const handleBlockImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const target = pendingImageTargetRef.current;
    if (!target) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const base64Img = reader.result;
      mutateActiveDocPages((pages) => {
        const page = pages.find((p) => p.page_number === target.pageNum);
        if (!page) return pages;
        const curBlock = page.blocks[target.blockIdx];
        const newImgBlock: PreviewBlock = {
          type: "image",
          has_image: true,
          image_src: base64Img,
          align: "center",
          p_idx: target.replace && curBlock ? curBlock.p_idx : undefined,
          text: "",
        };

        if (target.replace && curBlock) {
          if (curBlock.p_idx !== undefined) {
            setEditedParagraphs((prev) => ({ ...prev, [curBlock.p_idx!]: "" }));
            setEditedStyles((prev) => ({
              ...prev,
              [curBlock.p_idx!]: { ...(prev[curBlock.p_idx!] || {}), image_base64: base64Img },
            }));
          }
          page.blocks[target.blockIdx] = newImgBlock;
        } else {
          page.blocks.splice(target.blockIdx + 1, 0, newImgBlock);
        }
        return pages;
      }, "Gambar Dimasukkan", target.replace ? "Teks digantikan dengan gambar." : "Gambar baru disisipkan ke dokumen.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Add new Slide / Page
  const handleAddNewPage = () => {
    if (!activeDoc) return;
    const currentPages = activeDoc.analysis.pages || [];
    const newPageNum = currentPages.length + 1;
    const newPage: PreviewPage = {
      page_number: newPageNum,
      footer_label: `${newPageNum}`,
      is_cover: false,
      blocks: [
        {
          type: "h2",
          text: `Judul Slide / Bagian Baru`,
          bold: true,
          align: "left",
          size_pt: 13,
          p_idx: 8000 + newPageNum * 10,
        },
        {
          type: "paragraph",
          text: "Ketik isi teks di sini, atau klik tombol Sisipkan Gambar untuk menambahkan gambar atau foto ke slide ini.",
          align: "justify",
          line_spacing: 1.5,
          p_idx: 8000 + newPageNum * 10 + 1,
        },
      ],
    };
    mutateActiveDocPages(
      (pages) => [...pages, newPage],
      `Halaman Baru Ditambahkan`,
      `Halaman ${newPageNum} berhasil dibuat. Silakan ketik isi teks atau sisipkan gambar.`
    );
    setCurrentPage(newPageNum);
  };

  // Find location of activeBlockIndex
  const getActiveBlockLocation = () => {
    if (activeBlockIndex === null || !activeDoc) return null;
    for (const pg of activeDoc.analysis.pages || []) {
      const bIdx = pg.blocks.findIndex((b) => b.p_idx === activeBlockIndex);
      if (bIdx !== -1) {
        return { pageNumber: pg.page_number, blockIndex: bIdx, totalBlocks: pg.blocks.length };
      }
    }
    return null;
  };

  const activeLoc = getActiveBlockLocation();
  const canActiveMoveUp = activeLoc ? activeLoc.blockIndex > 0 : false;
  const canActiveMoveDown = activeLoc ? activeLoc.blockIndex < activeLoc.totalBlocks - 1 : false;

  const handleActiveBlockMoveUp = () => {
    if (!activeLoc || !canActiveMoveUp) return;
    handleMoveBlockUp(activeLoc.pageNumber, activeLoc.blockIndex);
  };

  const handleActiveBlockMoveDown = () => {
    if (!activeLoc || !canActiveMoveDown) return;
    handleMoveBlockDown(activeLoc.pageNumber, activeLoc.blockIndex);
  };

  const handleActiveBlockDelete = () => {
    if (!activeLoc) return;
    handleDeleteBlock(activeLoc.pageNumber, activeLoc.blockIndex);
    setActiveBlockIndex(null);
  };

  const handleSaveInlineEdits = async (
    silent = false
  ): Promise<WorkspaceDocumentResponse | null> => {
    if (!activeDoc || !hasUnsavedEdits) return activeDoc;
    setIsSavingEdits(true);
    setErrorMsg(null);
    try {
      const paragraph_updates = Object.entries(editedParagraphs).map(
        ([k, text]) => {
          const p_idx = Number(k);
          const st = editedStyles[p_idx] || {};
          return {
            p_idx,
            text,
            html: st.html,
            align: st.align,
            bold: st.bold,
            italic: st.italic,
            underline: st.underline,
            strike: st.strike,
            font_name: st.font_name,
            size_pt: st.size_pt,
            color: st.color,
            image_base64: st.image_base64,
            image_width_cm: st.image_width_cm,
          };
        }
      );
      const table_updates = Object.entries(editedTables).map(([k, rows]) => ({
        table_idx: Number(k),
        rows,
      }));

      // Gather any new pages to submit to backend
      const newPagesToSubmit = activeDoc.analysis.pages
        .filter((pg) => pg.blocks.some((b) => (b.p_idx ?? 0) >= 8000))
        .map((pg) => ({
          page_number: pg.page_number,
          blocks: pg.blocks.map((b) => ({
            type: b.type,
            text: b.text || "",
            image_base64: b.image_src || undefined,
            align: b.align,
            bold: b.bold,
          })),
        }));

      const resp = await updateDocumentContentApi({
        doc_id: activeDoc.doc_id,
        preset_id: selectedPresetId,
        paragraph_updates,
        table_updates,
        logo_update: {
          logo_width_cm: coverData.logo_width_cm,
          logo_align: coverData.logo_align,
          logo_margin_top_pt: coverData.logo_margin_top_pt,
          logo_base64: coverData.logo_base64,
        },
        cover_data: coverData,
        deleted_p_indices: deletedParagraphIndices.length > 0 ? deletedParagraphIndices : undefined,
        new_pages: newPagesToSubmit.length > 0 ? newPagesToSubmit : undefined,
        reordered_p_indices: reorderedPIndices.length > 0 ? reorderedPIndices : undefined,
      });
      setActiveDoc(resp);
      setEditedParagraphs({});
      setEditedStyles({});
      setEditedTables({});
      setDeletedParagraphIndices([]);
      setHasStructuralChanges(false);
      setReorderedPIndices([]);
      setDocxRefreshCount((c) => c + 1);
      setHistoryDocs((prev) =>
        prev.map((d) => (d.doc_id === resp.doc_id ? resp : d))
      );
      if (!silent) {
        triggerToast(
          "Perubahan teks disimpan",
          "Isi dokumen langsung tersimpan ke file .DOCX"
        );
      }
      return resp;
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menyimpan editan teks"
      );
      return null;
    } finally {
      setIsSavingEdits(false);
    }
  };

  const handleDownloadDocx = async () => {
    setIsDownloadMenuOpen(false);
    if (!activeDoc) return;
    let targetDoc = activeDoc;
    if (hasUnsavedEdits) {
      const saved = await handleSaveInlineEdits(true);
      if (!saved) return;
      targetDoc = saved;
    }
    const url = getDownloadDocxUrl(targetDoc.doc_id);
    const a = document.createElement("a");
    a.href = url;
    a.download = targetDoc.filename || "dokumen-rapidoc.docx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportPdf = async () => {
    setIsDownloadMenuOpen(false);
    if (hasUnsavedEdits) {
      await handleSaveInlineEdits(true);
    }
    triggerToast(
      "Membuka dialog cetak PDF",
      "Pilih tujuan 'Save as PDF' / 'Simpan sebagai PDF' untuk mengunduh dokumen"
    );
    // Switch to scroll view so all pages are present in DOM
    setPreviewRenderMode("scroll");
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleExportHtml = async () => {
    setIsDownloadMenuOpen(false);
    if (!activeDoc) return;
    if (hasUnsavedEdits) {
      await handleSaveInlineEdits(true);
    }
    const title = coverData.title || activeDoc.filename || "Dokumen RapiDoc";
    const pages = activeDoc.analysis?.pages || [];
    let bodyContent = "";

    pages.forEach((page) => {
      bodyContent += `<section class="a4-page ${page.is_cover ? "cover-page" : ""}">`;
      if (page.blocks) {
        page.blocks.forEach((b) => {
          const pVal = getEditableParagraphText(b);
          if (b.type === "image_logo" || b.has_image) {
            const logoSrc = coverData.logo_base64 || b.image_src;
            const align = coverData.logo_align || "center";
            const widthCm = coverData.logo_width_cm || "3.8";
            if (logoSrc) {
              bodyContent += `<div style="text-align:${align};margin:20px 0;"><img src="${logoSrc}" style="width:${widthCm}cm;max-width:100%;height:auto;display:inline-block;" alt="Logo" /></div>`;
            }
          } else if (b.type === "h1") {
            const align = b.align === "left" ? "left" : "center";
            bodyContent += `<h1 style="text-align:${align};font-size:16pt;font-weight:bold;margin:16px 0 8px 0;">${pVal}</h1>`;
          } else if (b.type === "h2" || b.type === "h3") {
            bodyContent += `<h2 style="text-align:left;font-size:13pt;font-weight:bold;margin:12px 0 6px 0;">${pVal}</h2>`;
          } else if (b.type === "list_bullet") {
            bodyContent += `<p style="padding-left:24px;text-indent:-16px;margin:4px 0;">&bull; ${pVal}</p>`;
          } else if (b.type === "table" && b.rows) {
            bodyContent += `<table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;margin:14px 0;"><tbody>`;
            b.rows.forEach((row, rI) => {
              bodyContent += `<tr ${rI === 0 ? 'style="background:#f1f5f9;font-weight:bold;"' : ""}>`;
              row.forEach((cell) => {
                bodyContent += `<td>${cell}</td>`;
              });
              bodyContent += `</tr>`;
            });
            bodyContent += `</tbody></table>`;
          } else {
            const align =
              b.align === "center"
                ? "center"
                : b.align === "right"
                  ? "right"
                  : b.align === "justify"
                    ? "justify"
                    : "left";
            const indent =
              (b.indent_cm || 0) > 0 && align !== "center" && align !== "right"
                ? "2rem"
                : "0";
            bodyContent += `<p style="text-align:${align};text-indent:${indent};line-height:1.6;margin:6px 0;">${pVal}</p>`;
          }
        });
      }
      if (page.footer_label) {
        bodyContent += `<footer style="text-align:center;font-size:10pt;color:#64748b;margin-top:auto;padding-top:24px;">${page.footer_label}</footer>`;
      }
      bodyContent += `</section>`;
    });

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: A4; margin: 0; }
  body { margin: 0; padding: 0; background: #e2e8f0; font-family: 'Times New Roman', Times, serif; color: #0f172a; }
  .a4-page { width: 210mm; min-height: 297mm; padding: 25mm 25mm 20mm 30mm; box-sizing: border-box; background: #ffffff; margin: 20px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08); page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: space-between; }
  .cover-page { text-align: center; justify-content: space-between; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #334155; }
  @media print { body { background: #fff; } .a4-page { margin: 0; box-shadow: none; width: 100%; min-height: 100vh; } }
</style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = (activeDoc.filename || "dokumen").replace(/\.[^/.]+$/, "");
    a.download = `${baseName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast("Dokumen HTML diunduh", "File .html mandiri berhasil disimpan");
  };

  const handleExportTxt = async () => {
    setIsDownloadMenuOpen(false);
    if (!activeDoc) return;
    if (hasUnsavedEdits) {
      await handleSaveInlineEdits(true);
    }
    const pages = activeDoc.analysis?.pages || [];
    let textContent = "";

    pages.forEach((page) => {
      textContent += `=== HALAMAN ${page.page_number} ===\n\n`;
      if (page.blocks) {
        page.blocks.forEach((b) => {
          const pVal = getEditableParagraphText(b);
          if (b.type === "h1") {
            textContent += `\n${pVal.toUpperCase()}\n${"=".repeat(pVal.length)}\n\n`;
          } else if (b.type === "h2" || b.type === "h3") {
            textContent += `\n${pVal}\n${"-".repeat(pVal.length)}\n\n`;
          } else if (b.type === "list_bullet") {
            textContent += `  * ${pVal}\n`;
          } else if (b.type === "table" && b.rows) {
            b.rows.forEach((r) => {
              textContent += r.join(" | ") + "\n";
            });
            textContent += "\n";
          } else if (b.type !== "image_logo") {
            textContent += `${pVal}\n\n`;
          }
        });
      }
      textContent += "\n";
    });

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = (activeDoc.filename || "dokumen").replace(/\.[^/.]+$/, "");
    a.download = `${baseName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast("File Teks diunduh", "Format .txt berhasil disimpan");
  };

  const handleExportMarkdown = async () => {
    setIsDownloadMenuOpen(false);
    if (!activeDoc) return;
    if (hasUnsavedEdits) {
      await handleSaveInlineEdits(true);
    }
    const pages = activeDoc.analysis?.pages || [];
    let mdContent = "";

    pages.forEach((page, pIdx) => {
      if (pIdx > 0) mdContent += `\n\n---\n\n`;
      if (page.blocks) {
        page.blocks.forEach((b) => {
          const pVal = getEditableParagraphText(b);
          if (b.type === "h1") {
            mdContent += `# ${pVal}\n\n`;
          } else if (b.type === "h2") {
            mdContent += `## ${pVal}\n\n`;
          } else if (b.type === "h3") {
            mdContent += `### ${pVal}\n\n`;
          } else if (b.type === "list_bullet") {
            mdContent += `* ${pVal}\n`;
          } else if (b.type === "table" && b.rows && b.rows.length > 0) {
            mdContent += "\n";
            const headerRow = b.rows[0];
            mdContent += `| ${headerRow.join(" | ")} |\n`;
            mdContent += `| ${headerRow.map(() => "---").join(" | ")} |\n`;
            for (let r = 1; r < b.rows.length; r++) {
              mdContent += `| ${b.rows[r].join(" | ")} |\n`;
            }
            mdContent += "\n";
          } else if (b.type !== "image_logo") {
            mdContent += `${pVal}\n\n`;
          }
        });
      }
    });

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = (activeDoc.filename || "dokumen").replace(/\.[^/.]+$/, "");
    a.download = `${baseName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast("File Markdown diunduh", "Format .md berhasil disimpan");
  };

  const handleToggleEditMode = () => {
    if (!isEditMode && previewRenderMode === "docx_preview") {
      setPreviewRenderMode("paginated");
    }
    setIsEditMode((v) => !v);
  };

  // Handler: Format Sekarang (Apply 12 OOXML Rules)
  const handleFormatNow = async () => {
    if (!activeDoc) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (hasUnsavedEdits) {
        const saved = await handleSaveInlineEdits(true);
        if (!saved) {
          setIsLoading(false);
          return;
        }
      }
      const resp = await formatDocumentApi({
        doc_id: activeDoc.doc_id,
        preset_id: selectedPresetId,
        custom_preset: currentPreset,
        rules,
        cover_data: coverData,
        raw_markdown: activeRawMarkdown,
      });
      setActiveDoc(resp);
      setEditedParagraphs({});
      setEditedTables({});
      setDocxRefreshCount((c) => c + 1);
      setHistoryDocs((prev) =>
        prev.map((d) => (d.doc_id === resp.doc_id ? resp : d))
      );
      setIsMobileDrawerOpen(false);
      triggerToast(
        "Format dokumen selesai",
        `${activeRulesCount} aturan OOXML diterapkan • Siap diunduh (.DOCX)`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memformat dokumen");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Logo Upload (converts to base64 for both preview & backend OOXML picture embedding)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCoverData((prev) => ({ ...prev, logo_base64: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handler: Save Custom Preset from TemplateModal
  const handleSaveCustomPreset = async (updated: Partial<PresetTemplate>) => {
    try {
      const res = await saveCustomPresetApi(updated);
      setPresets(res.presets);
      setSelectedPresetId(res.preset.id);
    } catch {
      const localCustom: PresetTemplate = {
        ...currentPreset,
        ...updated,
        id: updated.id || `custom_${Date.now()}`,
        name: updated.name || "Template Custom",
        short_name: updated.short_name || "Custom",
        margin_label: `${updated.margin_top_cm}-${updated.margin_left_cm}-${updated.margin_bottom_cm}-${updated.margin_right_cm} cm`,
        is_custom: true,
      };
      setPresets((prev) => [...prev, localCustom]);
      setSelectedPresetId(localCustom.id);
    }
  };

  // ============================================================================
  // VIEW 1: HALAMAN INPUT DOKUMEN BARU (2 TAB: UNGGAH DOCX & TEMPEL TEKS)
  // ============================================================================
  if (viewMode === "input") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
        {/* Top Bar matching the video design */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-slate-800 hover:text-blue-600 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold tracking-tight">RapiDoc</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-medium text-slate-600">Workspace</span>
            </div>

            <div className="flex items-center gap-2.5">
              {backendOnline === true && (
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Engine OOXML Aktif
                </span>
              )}
              {backendOnline === false && (
                <button
                  type="button"
                  onClick={checkHealthAndPresets}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Backend Offline • Coba Lagi
                </button>
              )}
              {activeDoc && (
                <button
                  onClick={() => setViewMode("editor")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                >
                  <span>Kembali ke {activeDoc.filename.slice(0, 18)}...</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {/* Header Block */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600">
              WORKSPACE
            </span>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Dokumen baru
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Unggah dokumen Word (.docx) atau tempel teks dokumen langsung. Setelah
              dokumen siap, RapiDoc akan membuka workspace untuk memilih template,
              memeriksa format, dan menerapkan perbaikan.
            </p>

            {historyDocs.length > 0 && (
              <button
                onClick={() => setShowHistoryList(!showHistoryList)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <History className="h-3.5 w-3.5" />
                <span>
                  {showHistoryList
                    ? "Sembunyikan riwayat dokumen"
                    : `Lihat riwayat dokumen (${historyDocs.length})`}
                </span>
              </button>
            )}

            {showHistoryList && historyDocs.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-subtle space-y-2">
                {historyDocs.map((h) => (
                  <div
                    key={h.doc_id}
                    onClick={() => {
                      setActiveDoc(h);
                      setViewMode("editor");
                    }}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{h.filename}</p>
                        <p className="text-[11px] text-slate-500">
                          {h.size_kb} KB • {h.analysis.stats.estimated_pages} halaman
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                      {h.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preset Template Selector Card */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Pemilih Jenis Dokumen (Preset Template)
              </label>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <span>Kelola Template</span>
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-6">
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-6 text-xs text-slate-500 leading-relaxed">
                {currentPreset.description}
              </div>
            </div>

            {/* Quick Logo Universitas / Sekolah Upload on Input Page */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-[#F8FAFC] px-3.5 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {coverData.logo_base64 ? (
                    <img
                      src={coverData.logo_base64}
                      alt="Logo Universitas/Sekolah"
                      className="h-full w-full object-contain p-0.5"
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    Gambar Logo Universitas / Sekolah (untuk Cover &amp; Kop)
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {coverData.logo_base64
                      ? "Logo siap disematkan ke halaman cover dokumen"
                      : "Opsional: unggah file PNG / JPG / WEBP logo kampus atau sekolah"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                {coverData.logo_base64 && (
                  <button
                    type="button"
                    onClick={() => setCoverData((prev) => ({ ...prev, logo_base64: "" }))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>{coverData.logo_base64 ? "Ganti Logo" : "Tambah Gambar Logo"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Main Input Container Card (2 Tabs: Unggah DOCX | Tempel teks) */}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-subtle">
            {/* Segmented Tab Switcher */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setInputTab("upload")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${inputTab === "upload"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Unggah DOCX</span>
              </button>
              <button
                type="button"
                onClick={() => setInputTab("paste")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${inputTab === "paste"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Tempel teks</span>
              </button>
            </div>

            {/* TAB 1: UNGGAH DOCX */}
            {inputTab === "upload" && (
              <div className="mt-5">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const droppedFile = e.dataTransfer.files?.[0];
                    if (droppedFile) handleFileUpload(droppedFile);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition cursor-pointer ${dragActive
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 bg-[#F8FAFC] hover:border-blue-400 hover:bg-slate-50/80"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) handleFileUpload(f);
                    }}
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 shadow-subtle">
                    <CloudUpload className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-900">
                    {isLoading ? "Memvalidasi & Menganalisis DOCX..." : "Tarik dokumen DOCX ke sini"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Atau klik untuk memilih file. Hanya .docx, maksimum 20 MB.
                  </p>
                  <button
                    type="button"
                    disabled={isLoading}
                    className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-subtle hover:bg-slate-50"
                  >
                    {isLoading ? "Memproses..." : "Pilih file"}
                  </button>
                </div>

                {/* 3 Info Cards below dropzone matching video 00:00 */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-3.5">
                    <p className="text-xs font-bold text-slate-800">1. Validasi</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Struktur ZIP dan elemen OOXML diperiksa
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-3.5">
                    <p className="text-xs font-bold text-slate-800">2. Analisis</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Temuan format dipetakan per paragraf
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-3.5">
                    <p className="text-xs font-bold text-slate-800">3. Formatting</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      File DOCX asli diedit, konten dipertahankan
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TEMPEL TEKS / MARKDOWN */}
            {inputTab === "paste" && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600">
                    Mendukung teks biasa atau Markdown dari AI
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMarkdownText(
                        SAMPLE_TEXT_BY_PRESET[selectedPresetId] || SAMPLE_MAKALAH_MARKDOWN
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Isi Contoh {currentPreset.short_name}</span>
                  </button>
                </div>

                <textarea
                  value={markdownText}
                  onChange={(e) => setMarkdownText(e.target.value)}
                  rows={13}
                  placeholder={`Tempel teks dokumen Anda apa adanya di sini (bebas, tidak perlu simbol atau kode khusus).\n\nRapiDoc otomatis merapikan Cover, Kata Pengantar, Daftar Isi, BAB, Subbab, Daftar Pustaka, hingga CV & Surat Resmi.`}
                  className="w-full rounded-xl border border-blue-500/80 bg-white p-4 font-sans text-xs sm:text-sm text-slate-800 leading-relaxed focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Tempel teks bebas dari ChatGPT, Word, atau catatan Anda — otomatis dirapikan tanpa perlu kode khusus.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateFromMarkdown}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? "Membuat dokumen..." : "Buat dokumen"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        <TemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          currentPreset={currentPreset}
          onSavePreset={handleSaveCustomPreset}
        />
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: HALAMAN WORKSPACE (SPLIT VIEW DESKTOP / DRAWER DI MOBILE)
  // ============================================================================
  const pages: PreviewPage[] = activeDoc?.analysis.pages || [];
  const totalPages = Math.max(1, pages.length);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const activePageObj = pages[safeCurrentPage - 1] || pages[0];

  const handlePreviewScroll = () => {
    if (previewRenderMode !== "scroll" || isProgrammaticScrollRef.current) return;
    const container = previewScrollRef.current;
    if (!container || pages.length === 0) return;

    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const anchorY = containerRect.top + Math.min(220, containerRect.height * 0.35);
      let bestPage = pages[0]?.page_number || 1;

      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 28) {
        bestPage = pages[pages.length - 1].page_number;
      } else {
        let bestScore = Infinity;
        for (const pg of pages) {
          const el = pageRefs.current[pg.page_number];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= anchorY && rect.bottom >= anchorY) {
            bestPage = pg.page_number;
            bestScore = -1;
            break;
          }
          const dist = anchorY < rect.top ? rect.top - anchorY : anchorY - rect.bottom;
          if (dist < bestScore) {
            bestScore = dist;
            bestPage = pg.page_number;
          }
        }
      }

      setCurrentPage((prev) => (prev !== bestPage ? bestPage : prev));
    });
  };

  const jumpToPage = (targetPage: number) => {
    const clamped = Math.min(Math.max(1, targetPage), totalPages);
    setCurrentPage(clamped);
    if (previewRenderMode === "scroll") {
      const container = previewScrollRef.current;
      const el = pageRefs.current[clamped];
      if (container && el) {
        isProgrammaticScrollRef.current = true;
        const cRect = container.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        const nextTop = container.scrollTop + (eRect.top - cRect.top) - 20;
        container.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 550);
      }
    }
  };

  const findings = activeDoc?.analysis.findings || [];
  const filteredFindings = findings.filter((f) => {
    if (auditFilter === "all") return true;
    if (auditFilter === "font") return f.rule === "font_family" || f.rule === "font_size";
    if (auditFilter === "spacing")
      return f.rule === "line_spacing" || f.rule === "indentation" || f.rule === "alignment";
    if (auditFilter === "headings") return f.rule === "headings";
    if (auditFilter === "structure")
      return f.rule === "margins" || f.rule === "page_numbering" || f.rule === "toc";
    return true;
  });

  // Reusable Sidebar / Drawer Content (2 Tabs: Formatting & Pemeriksaan)
  const renderWorkspacePanelContent = () => (
    <div className="flex h-full flex-col bg-white">
      {/* Tab Header: Formatting | Pemeriksaan [29] */}
      <div className="grid grid-cols-2 border-b border-slate-200 px-2 pt-2">
        <button
          type="button"
          onClick={() => setPanelTab("formatting")}
          className={`flex items-center justify-center gap-2 border-b-2 py-2.5 text-xs font-semibold transition ${panelTab === "formatting"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Formatting</span>
        </button>

        <button
          type="button"
          onClick={() => setPanelTab("audit")}
          className={`flex items-center justify-center gap-2 border-b-2 py-2.5 text-xs font-semibold transition ${panelTab === "audit"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
        >
          <span>Pemeriksaan</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${panelTab === "audit"
              ? "bg-blue-50 text-blue-700"
              : "bg-slate-100 text-slate-600"
              }`}
          >
            {findings.length}
          </span>
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {panelTab === "formatting" ? (
          <>
            {/* Template Pedoman Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Template pedoman
                </label>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <span>Kelola</span>
                  <Settings2 className="h-3 w-3" />
                </button>
              </div>
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short_name} — {p.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                {currentPreset.description}
              </p>
            </div>

            {/* Dedicated Logo Universitas / Sekolah / Instansi Card */}
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {coverData.logo_base64 ? (
                      <img
                        src={coverData.logo_base64}
                        alt="Logo Kampus/Sekolah"
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      Logo Universitas / Sekolah
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {coverData.logo_base64
                        ? "Logo kustom terpasang di Cover/Kop"
                        : "Opsional (PNG/JPG untuk Cover & Kop)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  {coverData.logo_base64 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCoverData((prev) => ({ ...prev, logo_base64: "" }))
                      }
                      title="Hapus logo kustom"
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="rounded-lg bg-white border border-blue-200 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    {coverData.logo_base64 ? "Ganti" : "Pilih Logo"}
                  </button>
                </div>
              </div>
            </div>

            {/* 12 Checkboxes Aturan yang diterapkan */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-700">
                  Aturan yang diterapkan
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = activeRulesCount === FORMATTING_RULES_META.length;
                      const nextState: Record<string, boolean> = {};
                      FORMATTING_RULES_META.forEach((r) => {
                        nextState[r.key] = !allOn;
                      });
                      setRules(nextState);
                    }}
                    className="text-[11px] font-medium text-blue-600 hover:underline"
                  >
                    {activeRulesCount === FORMATTING_RULES_META.length
                      ? "Reset"
                      : "Pilih semua"}
                  </button>
                  <span className="text-xs font-semibold text-slate-400">
                    {activeRulesCount}/{FORMATTING_RULES_META.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {FORMATTING_RULES_META.map((rule) => {
                  const isChecked = !!rules[rule.key];
                  const displayTitle =
                    rule.key === "extra_pages"
                      ? currentPreset.extra_page_label
                      : rule.title;
                  const displaySub =
                    rule.key === "extra_pages"
                      ? currentPreset.extra_page_desc
                      : rule.subtitle;

                  return (
                    <div key={rule.key} className="rounded-xl transition">
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setRules((prev) => ({
                              ...prev,
                              [rule.key]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-[13px] font-semibold text-slate-900">
                              {displayTitle}
                            </span>
                            {rule.key === "auto_cover" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setShowCoverForm(!showCoverForm);
                                }}
                                className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
                              >
                                <span>Isi Data Cover</span>
                                {showCoverForm ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{displaySub}</p>
                        </div>
                      </label>

                      {/* Expandable Cover / Kop Surat Form inside Rule 11 */}
                      {rule.key === "auto_cover" && showCoverForm && (
                        <div className="mt-3 ml-7 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Data Cover / Kop Surat
                            </span>
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <ImageIcon className="h-3 w-3 text-blue-600" />
                              <span>
                                {coverData.logo_base64 ? "Ganti Logo" : "Upload Logo"}
                              </span>
                            </button>
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-600 mb-0.5">
                              Judul Dokumen
                            </label>
                            <input
                              type="text"
                              value={coverData.title || ""}
                              onChange={(e) =>
                                setCoverData({ ...coverData, title: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] text-slate-600 mb-0.5">
                                Mata Kuliah / Perihal
                              </label>
                              <input
                                type="text"
                                value={coverData.course || ""}
                                onChange={(e) =>
                                  setCoverData({ ...coverData, course: e.target.value })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-600 mb-0.5">
                                Dosen Pengampu
                              </label>
                              <input
                                type="text"
                                value={coverData.lecturer || ""}
                                onChange={(e) =>
                                  setCoverData({ ...coverData, lecturer: e.target.value })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] text-slate-600 mb-0.5">
                                Nama Penulis
                              </label>
                              <input
                                type="text"
                                value={coverData.author || ""}
                                onChange={(e) =>
                                  setCoverData({ ...coverData, author: e.target.value })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-600 mb-0.5">
                                NIM / NPM / NIP
                              </label>
                              <input
                                type="text"
                                value={coverData.nim || ""}
                                onChange={(e) =>
                                  setCoverData({ ...coverData, nim: e.target.value })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-600 mb-0.5">
                              Program Studi
                            </label>
                            <input
                              type="text"
                              value={coverData.study_program || ""}
                              onChange={(e) =>
                                setCoverData({
                                  ...coverData,
                                  study_program: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] text-slate-600 mb-0.5">
                                Jurusan / Departemen
                              </label>
                              <input
                                type="text"
                                value={coverData.department || ""}
                                onChange={(e) =>
                                  setCoverData({
                                    ...coverData,
                                    department: e.target.value,
                                  })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-600 mb-0.5">
                                Fakultas
                              </label>
                              <input
                                type="text"
                                value={coverData.faculty || ""}
                                onChange={(e) =>
                                  setCoverData({ ...coverData, faculty: e.target.value })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="block text-[11px] text-slate-600 mb-0.5">
                                Universitas / Instansi
                              </label>
                              <input
                                type="text"
                                value={coverData.institution || ""}
                                onChange={(e) =>
                                  setCoverData({
                                    ...coverData,
                                    institution: e.target.value,
                                  })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-600 mb-0.5">
                                Tahun
                              </label>
                              <input
                                type="text"
                                value={coverData.year || ""}
                                onChange={(e) =>
                                  setCoverData({ ...coverData, year: e.target.value })
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-slate-200">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Pengaturan Posisi &amp; Ukuran Logo
                            </label>

                            {/* Alignment Logo */}
                            <div>
                              <span className="block text-[10px] text-slate-500 mb-1">
                                Posisi Perataan Logo
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { id: "left", label: "Kiri", icon: AlignLeft },
                                  { id: "center", label: "Tengah", icon: AlignCenter },
                                  { id: "right", label: "Kanan", icon: AlignRight },
                                ].map((al) => {
                                  const IconComp = al.icon;
                                  const isSel = (coverData.logo_align || "center") === al.id;
                                  return (
                                    <button
                                      key={al.id}
                                      type="button"
                                      onClick={() =>
                                        setCoverData({ ...coverData, logo_align: al.id })
                                      }
                                      className={`inline-flex items-center justify-center gap-1 py-1 rounded border text-xs font-semibold transition ${isSel
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                      <IconComp className="h-3 w-3" />
                                      <span>{al.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Ukuran Logo Slider & Presets */}
                            <div>
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="text-slate-600">Ukuran Logo:</span>
                                <span className="font-bold text-blue-700">
                                  {parseFloat(coverData.logo_width_cm || "3.8").toFixed(1)} cm
                                </span>
                              </div>
                              <input
                                type="range"
                                min="1.8"
                                max="7.5"
                                step="0.2"
                                value={coverData.logo_width_cm || "3.8"}
                                onChange={(e) =>
                                  setCoverData({ ...coverData, logo_width_cm: e.target.value })
                                }
                                className="w-full accent-blue-600"
                              />
                              <div className="flex items-center justify-between gap-1 mt-1">
                                {["2.8", "3.8", "4.8", "6.0"].map((sz) => (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() =>
                                      setCoverData({ ...coverData, logo_width_cm: sz })
                                    }
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${Math.abs(parseFloat(coverData.logo_width_cm || "3.8") - parseFloat(sz)) < 0.2
                                      ? "bg-blue-600 text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                      }`}
                                  >
                                    {sz} cm
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* TAB 2: PEMERIKSAAN (AUDIT PELANGGARAN FORMAT PER PARAGRAF) */
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Ringkasan Pemeriksaan Format
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {findings.length} temuan
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Dibandingkan terhadap standar{" "}
                <strong className="text-slate-700">{currentPreset.name}</strong> (
                {currentPreset.font_name} {currentPreset.font_size_pt}pt, spasi{" "}
                {currentPreset.line_spacing}).
              </p>

              {/* Filter Chips */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "Semua" },
                  { id: "font", label: "Font & Ukuran" },
                  { id: "spacing", label: "Spasi & Indent" },
                  { id: "headings", label: "Heading" },
                  { id: "structure", label: "Margin & TOC" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setAuditFilter(chip.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${auditFilter === chip.id
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-5 w-5" />
                </div>
                <p className="mt-2.5 text-xs font-bold text-emerald-950">
                  Format Dokumen Sudah Rapi
                </p>
                <p className="mt-1 text-[11px] text-emerald-700">
                  Tidak ada pelanggaran format pada kategori ini. Dokumen siap diunduh.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredFindings.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-subtle hover:border-blue-300 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        {item.severity === "warning" ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        )}
                        {item.location}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {item.rule}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                      {item.message}
                    </p>
                    {item.snippet && (
                      <p className="mt-1.5 truncate rounded bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-500">
                        &ldquo;{item.snippet}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Sticky Action inside Sidebar */}
      <div className="border-t border-slate-200 bg-slate-50/70 p-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={handleFormatNow}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{isLoading ? "Memproses Format..." : "Terapkan Format Sekarang"}</span>
        </button>
      </div>
    </div>
  );

  // Helper to render a single realistic A4 Page Sheet
  const renderA4PageSheet = (pageObj: PreviewPage) => {
    const fontClass =
      currentPreset.font_name.toLowerCase().includes("calibri")
        ? "doc-font-calibri"
        : currentPreset.font_name.toLowerCase().includes("arial")
          ? "doc-font-arial"
          : "doc-font-times";

    return (
      <div
        key={pageObj.page_number}
        ref={(el) => {
          pageRefs.current[pageObj.page_number] = el;
        }}
        onDoubleClick={() => {
          if (!isEditMode) setIsEditMode(true);
        }}
        style={{
          transform: `scale(${zoomPercent / 100})`,
          transformOrigin: "top center",
        }}
        className={`relative mx-auto w-full max-w-[680px] min-h-[700px] sm:min-h-[860px] rounded-sm border bg-white shadow-paper transition-transform ${fontClass} text-slate-950 flex flex-col justify-between px-4 py-6 sm:px-12 sm:py-12 md:px-16 md:py-14 ${isEditMode ? "border-blue-300 ring-2 ring-blue-500/10" : "border-slate-200/90"
          }`}
      >
        <div
          className={
            pageObj.is_cover
              ? "flex-1 flex flex-col justify-between py-2 space-y-4"
              : "space-y-3"
          }
        >
          {pageObj.blocks.map((b, bIdx) => {
            const isCoverLogo = b.type === "image_logo" || (pageObj.is_cover && b.has_image && bIdx < 6);
            if (isCoverLogo) {
              const displayLogoSrc = coverData.logo_base64 || b.image_src;
              const logoWidthCm = parseFloat(coverData.logo_width_cm || "3.8") || 3.8;
              const logoAlign = coverData.logo_align || "center";
              const logoMarginTopPt = parseFloat(coverData.logo_margin_top_pt || "8") || 8;

              return (
                <div
                  key={bIdx}
                  className={`my-4 flex flex-col transition-all relative group ${logoAlign === "left"
                    ? "items-start text-left"
                    : logoAlign === "right"
                      ? "items-end text-right"
                      : "items-center text-center"
                    }`}
                  style={{
                    paddingTop: `${Math.max(0, logoMarginTopPt)}pt`,
                  }}
                >
                  {/* Floating Logo Controls (In Edit Mode or on Hover) */}
                  <div className="mb-2 flex flex-wrap items-center justify-center gap-1 rounded-xl border border-blue-200 bg-white/95 px-2.5 py-1 shadow-md backdrop-blur text-xs z-20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                      Logo:
                    </span>

                    {/* Alignment buttons */}
                    <button
                      type="button"
                      onClick={() => setCoverData((p) => ({ ...p, logo_align: "left" }))}
                      className={`rounded p-1 transition ${logoAlign === "left" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      title="Ratakan Logo ke Kiri"
                    >
                      <AlignLeft className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverData((p) => ({ ...p, logo_align: "center" }))}
                      className={`rounded p-1 transition ${logoAlign === "center" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      title="Ratakan Logo ke Tengah (Standar)"
                    >
                      <AlignCenter className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverData((p) => ({ ...p, logo_align: "right" }))}
                      className={`rounded p-1 transition ${logoAlign === "right" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      title="Ratakan Logo ke Kanan"
                    >
                      <AlignRight className="h-3 w-3" />
                    </button>

                    <div className="h-3 w-px bg-slate-200 mx-0.5" />

                    {/* Ukuran Logo */}
                    <button
                      type="button"
                      onClick={() =>
                        setCoverData((p) => ({
                          ...p,
                          logo_width_cm: Math.max(1.8, logoWidthCm - 0.4).toFixed(1),
                        }))
                      }
                      className="rounded p-1 text-slate-600 hover:bg-slate-100"
                      title="Perkecil Ukuran Logo (-)"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[42px] text-center font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded text-[11px] border border-blue-200">
                      {logoWidthCm.toFixed(1)} cm
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCoverData((p) => ({
                          ...p,
                          logo_width_cm: Math.min(7.5, logoWidthCm + 0.4).toFixed(1),
                        }))
                      }
                      className="rounded p-1 text-slate-600 hover:bg-slate-100"
                      title="Perbesar Ukuran Logo (+)"
                    >
                      <Plus className="h-3 w-3" />
                    </button>

                    {/* Preset Pills */}
                    <div className="hidden sm:flex items-center gap-1">
                      {["2.8", "3.8", "4.8", "6.0"].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setCoverData((p) => ({ ...p, logo_width_cm: sz }))}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${Math.abs(logoWidthCm - parseFloat(sz)) < 0.2
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>

                    <div className="h-3 w-px bg-slate-200 mx-0.5" />

                    {/* Move Logo Up / Down relative to text blocks */}
                    <button
                      type="button"
                      onClick={() => handleMoveBlockUp(pageObj.page_number, bIdx)}
                      disabled={bIdx === 0}
                      className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      title="Pindahkan Logo Naik Sebelum Teks"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveBlockDown(pageObj.page_number, bIdx)}
                      disabled={bIdx >= pageObj.blocks.length - 1}
                      className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      title="Pindahkan Logo Turun Sesudah Teks"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    <div className="h-3 w-px bg-slate-200 mx-0.5" />

                    {/* Vertical shift */}
                    <button
                      type="button"
                      onClick={() =>
                        setCoverData((p) => ({
                          ...p,
                          logo_margin_top_pt: Math.max(0, logoMarginTopPt - 4).toString(),
                        }))
                      }
                      className="rounded p-1 text-slate-600 hover:bg-slate-100"
                      title="Geser Posisi Logo Naik"
                    >
                      <ChevronUp className="h-3 w-3 text-blue-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCoverData((p) => ({
                          ...p,
                          logo_margin_top_pt: Math.min(48, logoMarginTopPt + 4).toString(),
                        }))
                      }
                      className="rounded p-1 text-slate-600 hover:bg-slate-100"
                      title="Geser Posisi Logo Turun"
                    >
                      <ChevronDown className="h-3 w-3 text-blue-600" />
                    </button>

                    <div className="h-3 w-px bg-slate-200 mx-0.5" />

                    {/* Change / Delete */}
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                      title="Ganti Gambar Logo"
                    >
                      <ImageIcon className="h-3 w-3" />
                      <span>Ganti</span>
                    </button>
                    {coverData.logo_base64 && (
                      <button
                        type="button"
                        onClick={() => setCoverData((p) => ({ ...p, logo_base64: "" }))}
                        className="rounded p-1 text-rose-500 hover:bg-rose-50"
                        title="Hapus Logo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Logo Display Image / SVG */}
                  <div
                    className={`relative rounded-lg p-1 transition-all ${isEditMode
                      ? "border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/10"
                      : "border border-transparent"
                      }`}
                    style={{
                      width: `${Math.round(logoWidthCm * 37.8)}px`,
                      maxWidth: "100%",
                    }}
                  >
                    {displayLogoSrc ? (
                      <img
                        src={displayLogoSrc}
                        alt="Logo Instansi"
                        className="h-auto w-full object-contain mx-auto select-none"
                      />
                    ) : (
                      /* Built-in High-Resolution Academic Crest Emblem */
                      <div className="flex flex-col items-center">
                        <svg
                          viewBox="0 0 160 155"
                          className="h-full w-full max-h-28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M80 12 C95 32, 108 52, 80 86 C52 52, 65 32, 80 12 Z"
                            fill="#F59E0B"
                          />
                          <path
                            d="M35 45 C42 28, 62 35, 73 78 C48 68, 32 58, 35 45 Z"
                            fill="#FBBF24"
                          />
                          <path
                            d="M125 45 C118 28, 98 35, 87 78 C112 68, 128 58, 125 45 Z"
                            fill="#FBBF24"
                          />
                          <path
                            d="M24 72 C32 58, 52 64, 72 88 C46 86, 26 82, 24 72 Z"
                            fill="#F59E0B"
                          />
                          <path
                            d="M136 72 C128 58, 108 64, 88 88 C114 86, 134 82, 136 72 Z"
                            fill="#F59E0B"
                          />
                          <circle cx="80" cy="88" r="18" fill="#1D4ED8" />
                          <path
                            d="M52 104 L108 104 L102 114 L58 114 Z"
                            fill="#F59E0B"
                          />
                        </svg>
                        <span className="mt-1 text-base font-extrabold tracking-wider text-[#1E3A8A] font-sans">
                          {coverData.institution
                            ? coverData.institution
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 6)
                            : "UNNES"}
                        </span>
                        <span className="text-[8px] font-bold tracking-widest uppercase text-slate-600 font-sans">
                          {coverData.institution || "UNIVERSITAS NEGERI SEMARANG"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (b.type === "image" || b.has_image) {
              const imgSrc = b.image_src || "";
              const align = b.align || "center";
              const widthCm = b.image_width_cm || 7.0;

              return (
                <div
                  key={bIdx}
                  className={`my-3 flex flex-col transition-all relative group/img-block ${align === "left"
                    ? "items-start text-left"
                    : align === "right"
                      ? "items-end text-right"
                      : "items-center text-center"
                    }`}
                >
                  {/* Floating Image Toolbar in Edit Mode or on Hover */}
                  {isEditMode && (
                    <div className="mb-1.5 flex flex-wrap items-center gap-1 rounded-xl border border-blue-200 bg-white/95 px-2.5 py-1 shadow-md backdrop-blur text-xs z-20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                        Gambar:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateBlock(pageObj.page_number, bIdx, { align: "left" })}
                        className={`rounded p-1 ${align === "left" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                        title="Rata Kiri"
                      >
                        <AlignLeft className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateBlock(pageObj.page_number, bIdx, { align: "center" })}
                        className={`rounded p-1 ${align === "center" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                        title="Rata Tengah"
                      >
                        <AlignCenter className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateBlock(pageObj.page_number, bIdx, { align: "right" })}
                        className={`rounded p-1 ${align === "right" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                        title="Rata Kanan"
                      >
                        <AlignRight className="h-3 w-3" />
                      </button>
                      <div className="h-3 w-px bg-slate-200 mx-0.5" />
                      {[4, 6, 8, 11, 15].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleUpdateBlock(pageObj.page_number, bIdx, { image_width_cm: sz })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${Math.abs(widthCm - sz) < 0.5
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                          {sz}cm
                        </button>
                      ))}
                      <div className="h-3 w-px bg-slate-200 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => handleMoveBlockUp(pageObj.page_number, bIdx)}
                        disabled={bIdx === 0}
                        className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                        title="Geser Gambar ke Atas"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBlockDown(pageObj.page_number, bIdx)}
                        disabled={bIdx >= pageObj.blocks.length - 1}
                        className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                        title="Geser Gambar ke Bawah"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <div className="h-3 w-px bg-slate-200 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => triggerBlockImagePicker(pageObj.page_number, bIdx, true)}
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        title="Ganti Gambar"
                      >
                        <ImageIcon className="h-3 w-3" />
                        <span>Ganti</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(pageObj.page_number, bIdx)}
                        className="rounded p-1 text-rose-500 hover:bg-rose-50"
                        title="Hapus Gambar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Image Display */}
                  <div
                    className={`relative rounded-lg p-1 transition-all ${isEditMode
                      ? "border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/10"
                      : "border border-transparent"
                      }`}
                    style={{
                      width: `${Math.round(widthCm * 37.8)}px`,
                      maxWidth: "100%",
                    }}
                  >
                    <img
                      src={imgSrc}
                      alt={b.text || "Gambar Dokumen"}
                      className="h-auto w-full object-contain mx-auto select-none rounded"
                    />
                  </div>
                </div>
              );
            }

            if (b.type === "bib_item") {
              const pVal = getEditableParagraphText(b);
              if (isEditMode && b.p_idx !== undefined) {
                const pIdx = b.p_idx;
                return (
                  <WordRichEditorBlock
                    key={bIdx}
                    pIdx={pIdx}
                    value={pVal}
                    isModified={editedParagraphs[pIdx] !== undefined}
                    blockStyle={editedStyles[pIdx]}
                    isActive={activeBlockIndex === pIdx}
                    onFocus={(el) => {
                      setActiveBlockIndex(pIdx);
                      activeTextareaRef.current = el;
                    }}
                    onChange={(val) => handleParagraphEdit(pIdx, b.text || "", val)}
                    onMoveUp={() => handleMoveBlockUp(pageObj.page_number, bIdx)}
                    onMoveDown={() => handleMoveBlockDown(pageObj.page_number, bIdx)}
                    onDelete={() => handleDeleteBlock(pageObj.page_number, bIdx)}
                    onInsertImage={() => triggerBlockImagePicker(pageObj.page_number, bIdx, true)}
                    canMoveUp={bIdx > 0}
                    canMoveDown={bIdx < pageObj.blocks.length - 1}
                    className="pl-8 -indent-8 text-justify leading-[1.7]"
                    style={{ fontSize: "13.5px" }}
                    ariaLabel="Edit entri daftar pustaka"
                  />
                );
              }
              return (
                <div
                  key={bIdx}
                  className="pl-8 -indent-8 text-justify leading-[1.7]"
                  style={{ fontSize: "13.5px" }}
                  dangerouslySetInnerHTML={{ __html: pVal }}
                />
              );
            }

            if (b.type === "toc_item") {
              const pVal = getEditableParagraphText(b);
              if (isEditMode && b.p_idx !== undefined) {
                const pIdx = b.p_idx;
                return (
                  <WordRichEditorBlock
                    key={bIdx}
                    pIdx={pIdx}
                    value={pVal}
                    isModified={editedParagraphs[pIdx] !== undefined}
                    blockStyle={editedStyles[pIdx]}
                    isActive={activeBlockIndex === pIdx}
                    onFocus={(el) => {
                      setActiveBlockIndex(pIdx);
                      activeTextareaRef.current = el;
                    }}
                    onChange={(val) => handleParagraphEdit(pIdx, b.text || "", val)}
                    onMoveUp={() => handleMoveBlockUp(pageObj.page_number, bIdx)}
                    onMoveDown={() => handleMoveBlockDown(pageObj.page_number, bIdx)}
                    onDelete={() => handleDeleteBlock(pageObj.page_number, bIdx)}
                    onInsertImage={() => triggerBlockImagePicker(pageObj.page_number, bIdx, true)}
                    canMoveUp={bIdx > 0}
                    canMoveDown={bIdx < pageObj.blocks.length - 1}
                    className={`text-left leading-[1.55] ${b.bold ? "font-bold" : "font-normal"}`}
                    style={{ fontSize: "13px" }}
                    ariaLabel="Edit entri daftar isi"
                  />
                );
              }
              return (
                <div
                  key={bIdx}
                  className={`text-left whitespace-pre leading-[1.55] ${b.bold ? "font-bold" : "font-normal"}`}
                  style={{ fontSize: "13px" }}
                  dangerouslySetInnerHTML={{ __html: pVal }}
                />
              );
            }

            if (b.type === "table" && b.rows) {
              const tableRows = getEditableTableRows(b);
              const tIdx = b.table_idx;
              const isTableModified =
                tIdx !== undefined && editedTables[tIdx] !== undefined;
              return (
                <div key={bIdx} className="my-4 overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-800 text-xs">
                    <tbody>
                      {tableRows.map((row, rI) => (
                        <tr
                          key={rI}
                          className={rI === 0 ? "bg-slate-100 font-bold" : ""}
                        >
                          {row.map((cell, cI) => (
                            <td
                              key={cI}
                              className={`border border-slate-700 text-left ${isEditMode && tIdx !== undefined
                                ? "p-1"
                                : "px-2.5 py-1.5"
                                }`}
                            >
                              {isEditMode && tIdx !== undefined ? (
                                <AutoResizeTextarea
                                  value={cell}
                                  isModified={
                                    isTableModified &&
                                    cell !== (b.rows?.[rI]?.[cI] ?? "")
                                  }
                                  onChange={(val) =>
                                    handleTableCellEdit(
                                      tIdx,
                                      b.rows || [],
                                      rI,
                                      cI,
                                      val
                                    )
                                  }
                                  className={`text-left text-xs ${rI === 0 ? "font-bold" : "font-normal"
                                    }`}
                                  ariaLabel={`Edit sel tabel baris ${rI + 1} kolom ${cI + 1}`}
                                />
                              ) : (
                                cell
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            if (b.type === "h1") {
              const pVal = getEditableParagraphText(b);
              if (isEditMode && b.p_idx !== undefined) {
                const pIdx = b.p_idx;
                return (
                  <WordRichEditorBlock
                    key={bIdx}
                    pIdx={pIdx}
                    value={pVal}
                    isModified={editedParagraphs[pIdx] !== undefined}
                    blockStyle={editedStyles[pIdx]}
                    isActive={activeBlockIndex === pIdx}
                    onFocus={(el) => {
                      setActiveBlockIndex(pIdx);
                      activeTextareaRef.current = el;
                    }}
                    onChange={(val) => handleParagraphEdit(pIdx, b.text || "", val)}
                    onMoveUp={() => handleMoveBlockUp(pageObj.page_number, bIdx)}
                    onMoveDown={() => handleMoveBlockDown(pageObj.page_number, bIdx)}
                    onDelete={() => handleDeleteBlock(pageObj.page_number, bIdx)}
                    onInsertImage={() => triggerBlockImagePicker(pageObj.page_number, bIdx, true)}
                    canMoveUp={bIdx > 0}
                    canMoveDown={bIdx < pageObj.blocks.length - 1}
                    className={`pt-2 pb-1 font-bold leading-snug ${b.align === "left" ? "text-left" : "text-center"
                      } ${currentPreset.id === "cv_ats"
                        ? "border-b border-slate-800 mb-1.5 tracking-wide"
                        : "pb-2"
                      }`}
                    style={{ fontSize: `${Math.min(18, (b.size_pt || 14) + 1)}px` }}
                    ariaLabel="Edit judul bab"
                  />
                );
              }
              return (
                <div
                  key={bIdx}
                  className={`pt-2 pb-1 font-bold leading-snug whitespace-pre-line ${b.align === "left" ? "text-left" : "text-center"
                    } ${currentPreset.id === "cv_ats"
                      ? "border-b border-slate-800 mb-1.5 tracking-wide"
                      : "pb-2"
                    }`}
                  style={{ fontSize: `${Math.min(18, (b.size_pt || 14) + 1)}px` }}
                  dangerouslySetInnerHTML={{ __html: pVal }}
                />
              );
            }

            if (b.type === "h2" || b.type === "h3") {
              const pVal = getEditableParagraphText(b);
              if (isEditMode && b.p_idx !== undefined) {
                const pIdx = b.p_idx;
                return (
                  <WordRichEditorBlock
                    key={bIdx}
                    pIdx={pIdx}
                    value={pVal}
                    isModified={editedParagraphs[pIdx] !== undefined}
                    blockStyle={editedStyles[pIdx]}
                    isActive={activeBlockIndex === pIdx}
                    onFocus={(el) => {
                      setActiveBlockIndex(pIdx);
                      activeTextareaRef.current = el;
                    }}
                    onChange={(val) => handleParagraphEdit(pIdx, b.text || "", val)}
                    onMoveUp={() => handleMoveBlockUp(pageObj.page_number, bIdx)}
                    onMoveDown={() => handleMoveBlockDown(pageObj.page_number, bIdx)}
                    onDelete={() => handleDeleteBlock(pageObj.page_number, bIdx)}
                    onInsertImage={() => triggerBlockImagePicker(pageObj.page_number, bIdx, true)}
                    canMoveUp={bIdx > 0}
                    canMoveDown={bIdx < pageObj.blocks.length - 1}
                    className="pt-2 font-bold text-left leading-snug"
                    style={{ fontSize: `${Math.min(16, b.size_pt || 12.5)}px` }}
                    ariaLabel="Edit subbab"
                  />
                );
              }
              return (
                <div
                  key={bIdx}
                  className="pt-2 font-bold text-left leading-snug"
                  style={{ fontSize: `${Math.min(16, b.size_pt || 12.5)}px` }}
                  dangerouslySetInnerHTML={{ __html: pVal }}
                />
              );
            }

            if (b.type === "list_number" || b.type === "list_bullet") {
              const pVal = getEditableParagraphText(b);
              if (isEditMode && b.p_idx !== undefined) {
                const pIdx = b.p_idx;
                return (
                  <div
                    key={bIdx}
                    className="flex items-start gap-1.5 pl-5 text-justify leading-[1.7]"
                    style={{ fontSize: "13.5px" }}
                  >
                    {b.type === "list_bullet" && (
                      <span className="mt-0.5 select-none">•</span>
                    )}
                    <WordRichEditorBlock
                      pIdx={pIdx}
                      value={pVal}
                      isModified={editedParagraphs[pIdx] !== undefined}
                      blockStyle={editedStyles[pIdx]}
                      isActive={activeBlockIndex === pIdx}
                      onFocus={(el) => {
                        setActiveBlockIndex(pIdx);
                        activeTextareaRef.current = el;
                      }}
                      onChange={(val) => handleParagraphEdit(pIdx, b.text || "", val)}
                      onMoveUp={() => handleMoveBlockUp(pageObj.page_number, bIdx)}
                      onMoveDown={() => handleMoveBlockDown(pageObj.page_number, bIdx)}
                      onDelete={() => handleDeleteBlock(pageObj.page_number, bIdx)}
                      onInsertImage={() => triggerBlockImagePicker(pageObj.page_number, bIdx, true)}
                      canMoveUp={bIdx > 0}
                      canMoveDown={bIdx < pageObj.blocks.length - 1}
                      className="text-justify leading-[1.7]"
                      style={{ fontSize: "13.5px" }}
                      ariaLabel="Edit item daftar"
                    />
                  </div>
                );
              }
              return (
                <div
                  key={bIdx}
                  className="pl-5 text-justify leading-[1.7]"
                  style={{ fontSize: "13.5px" }}
                >
                  {b.type === "list_bullet" ? "• " : ""}
                  <span dangerouslySetInnerHTML={{ __html: pVal }} />
                </div>
              );
            }

            const isCentered = b.align === "center";
            const isRight = b.align === "right";
            const pVal = getEditableParagraphText(b);

            if (isEditMode && b.p_idx !== undefined) {
              const pIdx = b.p_idx;
              return (
                <WordRichEditorBlock
                  key={bIdx}
                  pIdx={pIdx}
                  value={pVal}
                  isModified={editedParagraphs[pIdx] !== undefined}
                  blockStyle={editedStyles[pIdx]}
                  isActive={activeBlockIndex === pIdx}
                  onFocus={(el) => {
                    setActiveBlockIndex(pIdx);
                    activeTextareaRef.current = el;
                  }}
                  onChange={(val) => handleParagraphEdit(pIdx, b.text || "", val)}
                  onMoveUp={() => handleMoveBlockUp(pageObj.page_number, bIdx)}
                  onMoveDown={() => handleMoveBlockDown(pageObj.page_number, bIdx)}
                  onDelete={() => handleDeleteBlock(pageObj.page_number, bIdx)}
                  onInsertImage={() => triggerBlockImagePicker(pageObj.page_number, bIdx, true)}
                  canMoveUp={bIdx > 0}
                  canMoveDown={bIdx < pageObj.blocks.length - 1}
                  placeholder={!pVal || pVal.trim() === "" ? "Baris kosong — Klik ikon Sampah untuk menghapus celah ini, atau ketik teks" : undefined}
                  className={`${isCentered
                    ? "text-center"
                    : isRight
                      ? "text-right"
                      : b.align === "justify"
                        ? "text-justify"
                        : "text-left"
                    } ${b.bold ? "font-bold" : "font-normal"}`}
                  style={{
                    fontSize: `${b.bold && isCentered ? 15 : 13.5}px`,
                    lineHeight: b.line_spacing
                      ? Math.max(1.35, b.line_spacing * 1.15)
                      : 1.7,
                    textIndent:
                      !isCentered && !isRight && (b.indent_cm || 0) > 0
                        ? "2.25rem"
                        : "0px",
                  }}
                  ariaLabel="Edit paragraf"
                />
              );
            }

            return (
              <p
                key={bIdx}
                className={`whitespace-pre-line ${isCentered
                  ? "text-center"
                  : isRight
                    ? "text-right"
                    : b.align === "justify"
                      ? "text-justify"
                      : "text-left"
                  } ${b.bold ? "font-bold" : "font-normal"}`}
                style={{
                  fontSize: `${b.bold && isCentered ? 15 : 13.5}px`,
                  lineHeight: b.line_spacing ? Math.max(1.35, b.line_spacing * 1.15) : 1.7,
                  textIndent:
                    !isCentered && !isRight && (b.indent_cm || 0) > 0
                      ? "2.25rem"
                      : "0px",
                }}
                dangerouslySetInnerHTML={{ __html: pVal }}
              />
            );
          })}
        </div>

        {/* Page Footer Number (Roman i, ii or Arabic 1, 2) */}
        <div className="pt-8 text-center text-xs text-slate-600 select-none">
          {pageObj.footer_label}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-[#F1F5F9] text-slate-900 overflow-hidden">
      {/* ====================================================================
          TOP BAR (Matches video 00:07 & 00:14 on mobile & desktop)
         ==================================================================== */}
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        {/* Left: Back button + Document Icon + Filename + Status Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setViewMode("input")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Dokumen baru / Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="hidden xs:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <FileText className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="truncate text-xs sm:text-sm font-bold text-slate-900 max-w-[100px] xs:max-w-[150px] sm:max-w-[280px] md:max-w-md">
                {activeDoc?.filename || "DOKUMEN.docx"}
              </h1>

              {/* Status Badge */}
              {activeDoc?.status === "Siap diunduh" ? (
                <span className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full bg-emerald-50 px-1.5 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="hidden sm:inline">Siap diunduh</span>
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full bg-amber-50 px-1.5 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="hidden sm:inline">Belum diproses</span>
                </span>
              )}
            </div>

            <p className="truncate text-[10px] sm:text-[11px] text-slate-500">
              {activeDoc?.size_kb || 9} KB • {currentPreset.short_name} •{" "}
              {activeDoc?.page_delta && activeDoc.page_delta > 0
                ? `+${activeDoc.page_delta} hal`
                : `${totalPages} hal`}
            </p>
          </div>
        </div>

        {/* Right: Mode toggle, Format Sekarang, Unduh .DOCX (with Multi-Format Dropdown), and Mobile Drawer Button */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              setPreviewRenderMode((m) =>
                m === "paginated"
                  ? "scroll"
                  : m === "scroll"
                    ? "docx_preview"
                    : "paginated"
              )
            }
            title={
              previewRenderMode === "paginated"
                ? "Mode: Per Halaman A4 (Klik untuk Scroll Semua Halaman)"
                : previewRenderMode === "scroll"
                  ? "Mode: Scroll Semua Halaman (Klik untuk Render Binary docx-preview)"
                  : "Mode: docx-preview (Klik untuk Mode Per Halaman A4)"
            }
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-1.5 sm:px-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            {previewRenderMode === "paginated" ? (
              <>
                <Eye className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden md:inline">Halaman A4</span>
              </>
            ) : previewRenderMode === "scroll" ? (
              <>
                <MoreHorizontal className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden md:inline">Scroll A4</span>
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden md:inline">DOCX Preview</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleEditMode}
            className={`relative inline-flex h-8 items-center gap-1 sm:gap-1.5 rounded-lg border px-2 sm:px-2.5 text-xs font-semibold transition ${isEditMode
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            title="Edit teks dan tabel langsung di pratinjau web"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isEditMode ? "Edit Aktif" : "Edit Teks"}
            </span>
            {hasUnsavedEdits && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {unsavedEditCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleFormatNow}
            disabled={isLoading || isSavingEdits}
            className="inline-flex h-8 items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-blue-600 px-2 sm:px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{isLoading ? "Proses..." : "Format"}</span>
            <span className="hidden md:inline"> Sekarang</span>
          </button>

          {activeDoc && (
            <div className="relative shrink-0" ref={downloadMenuRef}>
              <div className="inline-flex items-center rounded-lg sm:rounded-xl shadow-sm overflow-hidden h-8">
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  disabled={isSavingEdits}
                  className={`inline-flex h-8 items-center gap-1 sm:gap-1.5 px-2 sm:px-3 text-xs font-semibold transition disabled:opacity-50 ${activeDoc.status === "Siap diunduh"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  title="Unduh dokumen dalam format Microsoft Word (.docx)"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {isSavingEdits ? "Menyimpan..." : "Unduh"}
                  </span>
                  <span className="hidden md:inline"> .DOCX</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDownloadMenuOpen((v) => !v)}
                  className={`h-8 px-1 sm:px-1.5 flex items-center justify-center transition border-l ${activeDoc.status === "Siap diunduh"
                    ? "bg-emerald-700 text-white border-emerald-500 hover:bg-emerald-800"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  title="Pilihan format unduh lain (PDF, HTML, TXT, MD)"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {isDownloadMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-1">
                    Format Unduhan Lain
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 transition"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-red-100 text-red-600 font-bold text-[10px]">PDF</span>
                    <div>
                      <div className="font-semibold text-slate-900">Dokumen PDF (.pdf)</div>
                      <div className="text-[10px] text-slate-500">Cetak / simpan presisi A4</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportHtml}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">HTML</span>
                    <div>
                      <div className="font-semibold text-slate-900">Halaman Web (.html)</div>
                      <div className="text-[10px] text-slate-500">File HTML mandiri dengan logo</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTxt}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 text-slate-700 transition"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-600 font-bold text-[10px]">TXT</span>
                    <div>
                      <div className="font-semibold text-slate-900">Teks Biasa (.txt)</div>
                      <div className="text-[10px] text-slate-500">Teks bersih berstruktur</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-100 text-purple-700 font-bold text-[10px]">MD</span>
                    <div>
                      <div className="font-semibold text-slate-900">Markdown (.md)</div>
                      <div className="text-[10px] text-slate-500">Heading & format Markdown</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Drawer Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="Buka Workspace Panel"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ====================================================================
          SECONDARY PREVIEW TOOLBAR (Halaman 1 dari 18 | < 1/18 > | - 95% + | ↻)
         ==================================================================== */}
      {errorMsg && (
        <div className="z-20 flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="z-20 flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 text-xs">
        {/* Left: Hidden on small mobile screens (< sm) so it doesn't collide with page navigation and zoom */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-slate-600 font-medium">
            Halaman {safeCurrentPage} dari {totalPages}
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            ESTIMASI
          </span>
        </div>

        {/* Center Page Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 mx-auto sm:mx-0">
          <button
            type="button"
            onClick={() => jumpToPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[50px] sm:min-w-[54px] rounded-lg border border-slate-200 bg-slate-50 px-2 sm:px-2.5 py-1 text-center text-xs font-semibold text-slate-800">
            {safeCurrentPage} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => jumpToPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPages}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleAddNewPage}
            className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
            title="Tambah slide / halaman baru ke dokumen"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Halaman</span>
          </button>
        </div>

        {/* Right Zoom & Refresh Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setZoomPercent((z) => Math.max(40, z - 10))}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
            title="Perkecil"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-9 sm:w-10 text-center font-semibold text-slate-700 text-xs">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={() => setZoomPercent((z) => Math.min(130, z + 10))}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
            title="Perbesar"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 640) {
                setZoomPercent(Math.max(50, Math.min(85, Math.floor(((window.innerWidth - 24) / 680) * 100))));
              } else {
                setZoomPercent(95);
              }
            }}
            className="ml-0.5 sm:ml-1 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="Reset Zoom & Sesuaikan Layar"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Microsoft Word Ribbon Toolbar (Only active when isEditMode is true) */}
      {isEditMode && (
        <div className="z-20 border-b border-blue-200 bg-white shadow-xs">
          <div className="flex flex-nowrap items-center gap-1 sm:gap-2 px-2.5 sm:px-6 py-1.5 text-xs overflow-x-auto scrollbar-thin scroll-smooth select-none">
            {/* Group 1: Undo / Redo */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 shrink-0">
              <button
                type="button"
                onClick={() => document.execCommand("undo")}
                className="rounded p-1 text-slate-700 hover:bg-slate-100"
                title="Batal / Undo (Ctrl+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => document.execCommand("redo")}
                className="rounded p-1 text-slate-700 hover:bg-slate-100"
                title="Ulangi / Redo (Ctrl+Y)"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Group 2: Font & Size */}
            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 shrink-0">
              <select
                value={
                  activeBlockIndex !== null && editedStyles[activeBlockIndex]?.font_name
                    ? editedStyles[activeBlockIndex].font_name
                    : currentPreset.font_name || "Times New Roman"
                }
                onChange={(e) => handleApplyFontFamily(e.target.value)}
                className="h-7 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                title="Jenis Font Dokumen"
              >
                <option value="Times New Roman">Times New Roman (Baku)</option>
                <option value="Calibri">Calibri (Modern)</option>
                <option value="Arial">Arial (Tegas)</option>
                <option value="Georgia">Georgia (Buku)</option>
                <option value="Garamond">Garamond (Klasik)</option>
                <option value="Courier New">Courier New (Monospace)</option>
              </select>

              <select
                value={
                  activeBlockIndex !== null && editedStyles[activeBlockIndex]?.size_pt
                    ? editedStyles[activeBlockIndex].size_pt
                    : currentPreset.font_size_pt || 12
                }
                onChange={(e) => handleApplyFontSize(Number(e.target.value))}
                className="h-7 w-20 rounded border border-slate-200 bg-slate-50 px-1 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                title="Ukuran Font (pt)"
              >
                <option value="9">9 pt</option>
                <option value="10">10 pt</option>
                <option value="11">11 pt</option>
                <option value="12">12 pt (Baku)</option>
                <option value="14">14 pt</option>
                <option value="16">16 pt</option>
                <option value="18">18 pt</option>
                <option value="20">20 pt</option>
                <option value="24">24 pt</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  const cur = (activeBlockIndex !== null && editedStyles[activeBlockIndex]?.size_pt) || currentPreset.font_size_pt || 12;
                  handleApplyFontSize(Math.min(32, cur + 1));
                }}
                className="rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                title="Perbesar Ukuran Font (A+)"
              >
                A<sup>+</sup>
              </button>
              <button
                type="button"
                onClick={() => {
                  const cur = (activeBlockIndex !== null && editedStyles[activeBlockIndex]?.size_pt) || currentPreset.font_size_pt || 12;
                  handleApplyFontSize(Math.max(8, cur - 1));
                }}
                className="rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                title="Perkecil Ukuran Font (A-)"
              >
                A<sup>-</sup>
              </button>

              {/* Case Change */}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-0.5 rounded px-1.5 py-1 text-slate-700 hover:bg-slate-100"
                  title="Ubah Huruf Besar/Kecil (Aa)"
                >
                  <CaseSensitive className="h-3.5 w-3.5" />
                  <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                </button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:flex flex-col rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-30 min-w-[150px]">
                  <button
                    type="button"
                    onClick={() => handleChangeCase("upper")}
                    className="px-3 py-1 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    HURUF BESAR SEMUA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeCase("lower")}
                    className="px-3 py-1 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    huruf kecil semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeCase("title")}
                    className="px-3 py-1 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Huruf Besar Setiap Kata
                  </button>
                </div>
              </div>
            </div>

            {/* Group 3: Formatting (B, I, U, S, Color, Highlight) */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 shrink-0">
              <button
                type="button"
                onClick={() => handleApplyFormatting("bold")}
                className={`rounded p-1.5 transition ${activeBlockIndex !== null && editedStyles[activeBlockIndex]?.bold
                  ? "bg-blue-100 text-blue-700 font-bold"
                  : "text-slate-700 hover:bg-slate-100"
                  }`}
                title="Tebal / Bold (Ctrl+B)"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormatting("italic")}
                className={`rounded p-1.5 transition ${activeBlockIndex !== null && editedStyles[activeBlockIndex]?.italic
                  ? "bg-blue-100 text-blue-700 italic"
                  : "text-slate-700 hover:bg-slate-100"
                  }`}
                title="Miring / Italic (Ctrl+I)"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormatting("underline")}
                className={`rounded p-1.5 transition ${activeBlockIndex !== null && editedStyles[activeBlockIndex]?.underline
                  ? "bg-blue-100 text-blue-700 underline"
                  : "text-slate-700 hover:bg-slate-100"
                  }`}
                title="Garis Bawah / Underline (Ctrl+U)"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyFormatting("strike")}
                className={`rounded p-1.5 transition ${activeBlockIndex !== null && editedStyles[activeBlockIndex]?.strike
                  ? "bg-blue-100 text-blue-700 line-through"
                  : "text-slate-700 hover:bg-slate-100"
                  }`}
                title="Coretan / Strikethrough"
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </button>

              {/* Text Color Swatches */}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-0.5 rounded p-1 text-slate-700 hover:bg-slate-100"
                  title="Warna Huruf / Teks"
                >
                  <span className="font-bold border-b-2 border-red-500 px-0.5 text-xs">A</span>
                  <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                </button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-30">
                  {[
                    { color: "#000000", label: "Hitam" },
                    { color: "#1e3a8a", label: "Navy" },
                    { color: "#dc2626", label: "Merah" },
                    { color: "#16a34a", label: "Hijau" },
                    { color: "#4b5563", label: "Abu-abu" },
                    { color: "#d97706", label: "Emas" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => handleApplyFormatting("color", c.color)}
                      className="h-5 w-5 rounded-full border border-slate-300 transition hover:scale-110"
                      style={{ backgroundColor: c.color }}
                      title={`Warna ${c.label}`}
                    />
                  ))}
                </div>
              </div>

              {/* Highlight / Stabilo */}
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-0.5 rounded p-1 text-slate-700 hover:bg-slate-100"
                  title="Warna Sorotan / Stabilo"
                >
                  <Highlighter className="h-3.5 w-3.5 text-amber-500" />
                  <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                </button>
                <div className="absolute left-0 top-full mt-1 hidden group-hover:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg z-30">
                  {[
                    { color: "transparent", label: "Tanpa Sorotan" },
                    { color: "#fef08a", label: "Kuning" },
                    { color: "#bbf7d0", label: "Hijau Muda" },
                    { color: "#bae6fd", label: "Biru Muda" },
                    { color: "#fbcfe8", label: "Pink Muda" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => handleApplyFormatting("highlight", c.color)}
                      className="h-5 w-5 rounded-full border border-slate-300 transition hover:scale-110 flex items-center justify-center text-[10px]"
                      style={{ backgroundColor: c.color === "transparent" ? "#ffffff" : c.color }}
                      title={c.label}
                    >
                      {c.color === "transparent" ? "✕" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Group 4: Alignment & Spacing */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 shrink-0">
              <button
                type="button"
                onClick={() => handleApplyAlignment("left")}
                className={`rounded p-1.5 transition ${activeBlockIndex !== null && editedStyles[activeBlockIndex]?.align === "left"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
                  }`}
                title="Rata Kiri (Ctrl+L)"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyAlignment("center")}
                className={`rounded p-1.5 transition ${activeBlockIndex !== null && editedStyles[activeBlockIndex]?.align === "center"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
                  }`}
                title="Rata Tengah (Ctrl+E)"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyAlignment("right")}
                className={`rounded p-1.5 transition ${activeBlockIndex !== null && editedStyles[activeBlockIndex]?.align === "right"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
                  }`}
                title="Rata Kanan (Ctrl+R)"
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyAlignment("justify")}
                className={`rounded p-1.5 transition ${activeBlockIndex !== null && editedStyles[activeBlockIndex]?.align === "justify"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
                  }`}
                title="Rata Kanan-Kiri / Justify (Ctrl+J)"
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </button>

              {/* Line Spacing */}
              <select
                value={
                  activeBlockIndex !== null && editedStyles[activeBlockIndex]?.line_spacing
                    ? editedStyles[activeBlockIndex].line_spacing
                    : currentPreset.line_spacing || 1.5
                }
                onChange={(e) => handleApplyLineSpacing(Number(e.target.value))}
                className="h-7 rounded border border-slate-200 bg-slate-50 px-1 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                title="Spasi Baris Paragraf"
              >
                <option value="1.0">Spasi 1.0</option>
                <option value="1.15">Spasi 1.15</option>
                <option value="1.5">Spasi 1.5 (Baku)</option>
                <option value="2.0">Spasi 2.0</option>
              </select>
            </div>

            {/* Group 5: Lists & Indent */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activeBlockIndex === null) return;
                  const el = activeTextareaRef.current;
                  if (!el) return;
                  const val = el.value.startsWith("• ") ? el.value.slice(2) : `• ${el.value}`;
                  el.value = val;
                  handleParagraphEdit(activeBlockIndex, el.value, val);
                }}
                className="rounded p-1.5 text-slate-700 hover:bg-slate-100"
                title="Daftar Butir (Bullet •)"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeBlockIndex === null) return;
                  const el = activeTextareaRef.current;
                  if (!el) return;
                  const val = el.value.startsWith("1. ") ? el.value.slice(3) : `1. ${el.value}`;
                  el.value = val;
                  handleParagraphEdit(activeBlockIndex, el.value, val);
                }}
                className="rounded p-1.5 text-slate-700 hover:bg-slate-100"
                title="Daftar Nomor (Numbered 1. 2. 3.)"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeBlockIndex === null) return;
                  setEditedStyles((p) => {
                    const cur = p[activeBlockIndex]?.indent_cm || 0;
                    return {
                      ...p,
                      [activeBlockIndex]: {
                        ...(p[activeBlockIndex] || {}),
                        indent_cm: Math.max(0, cur - 1.25),
                      },
                    };
                  });
                }}
                className="rounded p-1.5 text-slate-700 hover:bg-slate-100"
                title="Kurangi Inden Paragraf"
              >
                <Outdent className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeBlockIndex === null) return;
                  setEditedStyles((p) => {
                    const cur = p[activeBlockIndex]?.indent_cm || 0;
                    return {
                      ...p,
                      [activeBlockIndex]: {
                        ...(p[activeBlockIndex] || {}),
                        indent_cm: cur + 1.25,
                      },
                    };
                  });
                }}
                className="rounded p-1.5 text-slate-700 hover:bg-slate-100"
                title="Tambah Inden Paragraf (Tab)"
              >
                <Indent className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Group 6: Clean Formatting */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2 shrink-0">
              <button
                type="button"
                onClick={handleClearBlockFormat}
                className="inline-flex items-center gap-1 rounded p-1.5 text-slate-700 hover:bg-slate-100 text-xs"
                title="Hapus Format Khusus & Kembalikan ke Standar Baku"
              >
                <RemoveFormatting className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden xl:inline">Bersihkan</span>
              </button>
            </div>

            {/* Group 7: Tata Letak & Objek (Geser Atas/Bawah, Hapus Baris, Sisipkan Gambar, Tambah Halaman) */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2 shrink-0">
              <button
                type="button"
                onClick={handleActiveBlockMoveUp}
                disabled={!canActiveMoveUp}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-35 transition"
                title="Geser elemen aktif ke atas (naik menempati ruang kosong di atasnya)"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ke Atas</span>
              </button>
              <button
                type="button"
                onClick={handleActiveBlockMoveDown}
                disabled={!canActiveMoveDown}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-35 transition"
                title="Geser elemen aktif ke bawah"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ke Bawah</span>
              </button>
              <button
                type="button"
                onClick={handleActiveBlockDelete}
                disabled={!activeLoc}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-rose-600 hover:bg-rose-50 disabled:opacity-35 transition"
                title="Hapus baris aktif atau celah kosong (rapatkan ke atas)"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Hapus Baris</span>
              </button>
              <button
                type="button"
                onClick={() => triggerBlockImagePicker()}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-blue-700 hover:bg-blue-50 transition"
                title="Ganti teks terpilih dengan gambar, atau sisipkan gambar baru"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Gambar</span>
              </button>
              <button
                type="button"
                onClick={handleAddNewPage}
                className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100 transition"
                title="Tambah slide / halaman baru ke dokumen"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Halaman</span>
              </button>
            </div>

            {/* Active Block Indicator Badge */}
            <div className="ml-auto flex items-center gap-2 text-[11px] text-blue-700 font-medium shrink-0">
              {activeBlockIndex !== null ? (
                <span className="rounded bg-blue-100 px-1.5 sm:px-2 py-0.5 text-blue-800 font-semibold border border-blue-200 whitespace-nowrap">
                  <span className="sm:hidden">P#{activeBlockIndex}</span>
                  <span className="hidden sm:inline">Paragraf #{activeBlockIndex} Aktif</span>
                </span>
              ) : (
                <span className="text-slate-500 italic hidden md:inline">
                  Klik teks di halaman A4 untuk memformat
                </span>
              )}
            </div>

            {/* Ribbon Action Buttons: Simpan & Selesai */}
            <div className="ml-1 sm:ml-2 flex items-center gap-1 sm:gap-1.5 shrink-0">
              {hasUnsavedEdits && (
                <button
                  type="button"
                  onClick={() => handleSaveInlineEdits(false)}
                  disabled={isSavingEdits}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 sm:px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                  title="Simpan perubahan langsung ke file Word (.docx)"
                >
                  <Save className="h-3 w-3" />
                  <span className="hidden sm:inline">{isSavingEdits ? "Menyimpan..." : "Simpan .DOCX"}</span>
                  <span className="sm:hidden">Simpan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-50 transition"
                title="Keluar dari mode edit"
              >
                <Check className="h-3 w-3" />
                <span>Selesai</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MAIN WORKSPACE BODY (SPLIT VIEW: A4 PREVIEWER + SIDEBAR PANEL)
         ==================================================================== */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Document Previewer Area Utama */}
        <div
          ref={previewScrollRef}
          onScroll={handlePreviewScroll}
          className="relative flex-1 overflow-x-auto overflow-y-auto px-1 py-4 sm:px-8 sm:py-8"
        >
          {previewRenderMode === "docx_preview" && activeDoc && !activeDoc.doc_id.startsWith("local-") ? (
            <div className="pb-16 flex justify-center items-start min-w-full">
              <DocxClientRenderer
                docxUrl={getDownloadDocxUrl(activeDoc.doc_id)}
                zoomPercent={zoomPercent}
                refreshTrigger={docxRefreshCount}
              />
            </div>
          ) : previewRenderMode === "scroll" ? (
            <div className="space-y-8 pb-16 flex flex-col items-center min-w-full">
              {pages.map((pg) => renderA4PageSheet(pg))}
            </div>
          ) : (
            <div className="pb-16 flex justify-center items-start min-w-full">
              {activePageObj && renderA4PageSheet(activePageObj)}
            </div>
          )}

          {/* Floating Toast Notification at bottom left/center like video 00:10 */}
          {toastBanner && toastBanner.visible && (
            <div className="fixed bottom-5 left-4 z-40 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{toastBanner.title}</p>
                <p className="text-[11px] text-slate-500">{toastBanner.subtitle}</p>
              </div>
              <button
                onClick={() =>
                  setToastBanner((prev) => (prev ? { ...prev, visible: false } : null))
                }
                className="ml-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Desktop Permanent Sidebar (Split View) */}
        <aside className="hidden lg:block w-[390px] shrink-0 border-l border-slate-200 bg-white h-full">
          {renderWorkspacePanelContent()}
        </aside>

        {/* Mobile Slide-Over Drawer (Matches video 00:08 "Workspace panel") */}
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs lg:hidden">
            <div className="flex h-full w-[90%] max-w-[380px] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-bold text-slate-900">
                  Workspace Panel
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {renderWorkspacePanelContent()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input for Block Image Insertion & Replacement */}
      <input
        ref={blockImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBlockImageFileSelected}
      />

      {/* Custom Template Modal */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentPreset={currentPreset}
        onSavePreset={handleSaveCustomPreset}
      />
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#F8FAFC] text-sm text-slate-500">
          Memuat Workspace RapiDoc...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
