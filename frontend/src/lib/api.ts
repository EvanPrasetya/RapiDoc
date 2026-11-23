import { INITIAL_PRESETS, PresetTemplate } from "./sampleData";

export interface AuditFinding {
  id: string;
  location: string;
  rule: string;
  severity: "warning" | "info";
  message: string;
  snippet: string;
}

export interface PreviewBlock {
  type: string;
  p_idx?: number;
  table_idx?: number;
  text?: string;
  align?: string;
  font?: string;
  size_pt?: number;
  bold?: boolean;
  indent_cm?: number;
  left_indent_cm?: number;
  line_spacing?: number;
  has_image?: boolean;
  image_src?: string | null;
  image_width_cm?: number;
  rows?: string[][];
}

export interface PreviewPage {
  page_number: number;
  footer_label: string;
  is_cover: boolean;
  blocks: PreviewBlock[];
}

export interface DocumentAnalysis {
  findings: AuditFinding[];
  total_findings: number;
  stats: {
    paragraphs: number;
    headings: number;
    tables: number;
    words: number;
    estimated_pages: number;
  };
  pages: PreviewPage[];
}

export interface WorkspaceDocumentResponse {
  doc_id: string;
  filename: string;
  size_kb: number;
  status: "Belum diproses" | "Siap diunduh";
  preset_id: string;
  extracted_meta: Record<string, string>;
  page_delta?: number;
  analysis: DocumentAnalysis;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

const BACKEND_OFFLINE_MSG =
  "Engine Python (FastAPI) belum aktif di port 8000. Jalankan file start.bat atau jalankan 'uvicorn main:app --reload --port 8000' di folder backend, lalu klik Coba Lagi.";

async function extractApiErrorMessage(res: Response, fallbackMsg: string): Promise<string> {
  const rawText = await res.text().catch(() => "");
  if (rawText) {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed.detail === "string" && parsed.detail.trim()) {
        return parsed.detail.trim();
      }
    } catch {
      // ignore non-JSON body
    }
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return BACKEND_OFFLINE_MSG;
  }
  if (rawText.trim()) {
    return `${fallbackMsg} (HTTP ${res.status}): ${rawText.trim().slice(0, 140)}`;
  }
  return `${fallbackMsg} (HTTP ${res.status})`;
}

export async function checkBackendHealthApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPresets(): Promise<PresetTemplate[]> {
  try {
    const res = await fetch(`${API_BASE}/presets`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch presets");
    const data = await res.json();
    return data.presets || INITIAL_PRESETS;
  } catch {
    return INITIAL_PRESETS;
  }
}

export async function saveCustomPresetApi(
  presetData: Partial<PresetTemplate>
): Promise<{ preset: PresetTemplate; presets: PresetTemplate[] }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/presets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presetData),
    });
  } catch {
    throw new Error(BACKEND_OFFLINE_MSG);
  }
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, "Gagal menyimpan template custom"));
  }
  return res.json();
}

export async function uploadDocxApi(
  file: File,
  presetId: string
): Promise<WorkspaceDocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("preset_id", presetId);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(BACKEND_OFFLINE_MSG);
  }
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, "Gagal mengunggah dokumen DOCX"));
  }
  return res.json();
}

export async function createFromMarkdownApi(
  text: string,
  presetId: string,
  filename?: string,
  customPreset?: Partial<PresetTemplate>
): Promise<WorkspaceDocumentResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents/from-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        preset_id: presetId,
        filename,
        custom_preset: customPreset,
      }),
    });
  } catch {
    throw new Error(BACKEND_OFFLINE_MSG);
  }
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, "Gagal memproses teks di server backend")
    );
  }
  return res.json();
}

export async function formatDocumentApi(params: {
  doc_id: string;
  preset_id: string;
  custom_preset?: Partial<PresetTemplate>;
  rules: Record<string, boolean>;
  cover_data: Record<string, string>;
  raw_markdown?: string;
}): Promise<WorkspaceDocumentResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents/format`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    throw new Error(BACKEND_OFFLINE_MSG);
  }
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, "Gagal menerapkan format dokumen"));
  }
  return res.json();
}

export function getDownloadDocxUrl(docId: string): string {
  return `${API_BASE}/documents/${docId}/download`;
}

export interface InlineParagraphUpdate {
  p_idx: number;
  text: string;
  html?: string;
  align?: "left" | "center" | "right" | "justify";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  font_name?: string;
  size_pt?: number;
  color?: string;
  delete?: boolean;
  image_base64?: string;
  image_width_cm?: number;
}

export async function updateDocumentContentApi(params: {
  doc_id: string;
  preset_id?: string;
  paragraph_updates: InlineParagraphUpdate[];
  table_updates: { table_idx: number; rows: string[][] }[];
  logo_update?: Record<string, any>;
  cover_data?: Record<string, any>;
  deleted_p_indices?: number[];
  new_pages?: Array<{
    page_number: number;
    blocks: Array<{
      type: string;
      text?: string;
      image_base64?: string;
      image_width_cm?: number;
      align?: string;
      bold?: boolean;
    }>;
  }>;
  reordered_p_indices?: number[];
}): Promise<WorkspaceDocumentResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents/${params.doc_id}/update-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset_id: params.preset_id,
        paragraph_updates: params.paragraph_updates,
        table_updates: params.table_updates,
        logo_update: params.logo_update,
        cover_data: params.cover_data,
        deleted_p_indices: params.deleted_p_indices,
        new_pages: params.new_pages,
        reordered_p_indices: params.reordered_p_indices,
      }),
    });
  } catch {
    throw new Error(BACKEND_OFFLINE_MSG);
  }
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, "Gagal menyimpan perubahan teks ke dokumen DOCX")
    );
  }
  return res.json();
}
