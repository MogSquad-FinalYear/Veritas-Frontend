import { useRef, useState } from "react";
import { CloudUpload, FileWarning, Loader2 } from "lucide-react";
import * as api from "../../lib/api/legalrag";

export function UploadDropzone({
  base,
  caseId,
  onUploaded,
  pushToast,
}: {
  base: string;
  caseId: string;
  onUploaded: () => void;
  pushToast: (t: { tone: "success" | "error"; title: string; description?: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.uploadDocument(base, caseId, file);
      onUploaded();
      pushToast({
        tone: "success",
        title: `${res.doc_type} indexed`,
        description: `${res.chunks_indexed} chunk(s) added to ${caseId} · ${res.elapsed_s.toFixed(1)}s`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      pushToast({ tone: "error", title: "Upload failed", description: message });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center transition-colors ${
          busy ? "pointer-events-none opacity-60" : ""
        } ${
          dragging
            ? "border-[var(--lr-brand)] bg-[var(--lr-brand-soft)]"
            : "border-[var(--lr-border-strong)] hover:bg-[var(--lr-bg-subtle)]"
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--lr-text-muted)]" />
        ) : (
          <CloudUpload className="h-4 w-4 text-[var(--lr-text-faint)]" />
        )}
        <span className="text-[11px] font-medium text-[var(--lr-text-muted)]">
          {busy ? "Ingesting document…" : "Drop a FIR, charge sheet, or evidence file"}
        </span>
        <span className="text-[10px] text-[var(--lr-text-faint)]">PDF, JPG, PNG, TIFF</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.bmp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--lr-danger)]">
          <FileWarning className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
