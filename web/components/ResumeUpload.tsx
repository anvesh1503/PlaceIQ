"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const version = pdfjs.version || "4.4.168";
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let full = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) =>
      "str" in item ? (item as { str: string }).str : ""
    );
    full += strings.join(" ") + "\n";
  }
  return full.trim();
}

interface ResumeUploadProps {
  onFileReady: (file: File, text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ResumeUpload({ onFileReady, disabled, className }: ResumeUploadProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file || disabled || busy) return;
      if (file.type !== "application/pdf") {
        setError("Please upload a PDF file.");
        return;
      }
      setError(null);
      setBusy(true);
      try {
        const text = await extractTextFromPdf(file);
        if (!text) setError("Could not read text from PDF.");
        onFileReady(file, text);
      } catch {
        setError("Failed to parse PDF.");
      } finally {
        setBusy(false);
      }
    },
    [disabled, busy, onFileReady]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: disabled || busy,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30",
          isDragActive && "border-indigo-500 bg-indigo-50/50",
          (disabled || busy) && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        {busy ? (
          <FileText className="mb-2 h-10 w-10 text-indigo-600 animate-pulse" />
        ) : (
          <Upload className="mb-2 h-10 w-10 text-slate-400" />
        )}
        <p className="text-center text-sm font-medium text-slate-700">
          {busy ? "Extracting text…" : "Drag & drop your resume PDF"}
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">PDF only</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
