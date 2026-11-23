"use client";

import React, { useEffect, useRef, useState } from "react";

interface DocxClientRendererProps {
  docxUrl: string;
  zoomPercent: number;
  refreshTrigger?: number;
}

export default function DocxClientRenderer({
  docxUrl,
  zoomPercent,
  refreshTrigger = 0,
}: DocxClientRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function renderDocxBuffer() {
      if (!containerRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(docxUrl, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Gagal memuat binary DOCX dari server.");
        }
        const blob = await res.blob();
        const docxPreview = await import("docx-preview");
        if (!isMounted || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        await docxPreview.renderAsync(blob, containerRef.current, undefined, {
          className: "rapidoc-docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          useBase64URL: true,
        });
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal merender pratinjau docx-preview."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    renderDocxBuffer();
    return () => {
      isMounted = false;
    };
  }, [docxUrl, refreshTrigger]);

  return (
    <div className="w-full flex flex-col items-center">
      {loading && (
        <div className="my-8 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-medium text-slate-600 shadow-subtle">
          Merender struktur OOXML asli dengan docx-preview...
        </div>
      )}
      {error && (
        <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          transform: `scale(${zoomPercent / 100})`,
          transformOrigin: "top center",
        }}
        className="w-full max-w-4xl overflow-x-auto"
      />
    </div>
  );
}
