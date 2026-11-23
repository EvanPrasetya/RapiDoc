import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RapiDoc — Smart Document Auto-Formatter",
  description:
    "Periksa, analisis, dan rapikan format dokumen Microsoft Word (.docx) serta teks/Markdown menjadi file DOCX rapi dan 100% editable di Word.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
