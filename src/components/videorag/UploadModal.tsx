import { useRef, useState } from "react";
import { AlertCircle, FolderOpen, Loader2, UploadCloud, Video, X } from "lucide-react";
import * as api from "../../lib/api/videorag";

const ACCEPTED_EXT = [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"];
const MAX_SIZE = 500 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Phase = "idle" | "uploading" | "processing" | "error";

export function UploadModal({
  base,
  onClose,
  onUploadComplete,
}: {
  base: string;
  onClose: () => void;
  onUploadComplete: (caseId: string | null, hasPendingMatches: boolean) => void;
}) {
  const [caseId, setCaseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [status, setStatus] = useState<api.TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const isWorking = phase === "uploading" || phase === "processing";

  function pickFile(f: File | null) {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      setError(`Unsupported file type "${ext}". Use MP4, AVI, MOV, MKV, WEBM, FLV, or WMV.`);
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("File too large. Maximum size is 500MB.");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setPhase("uploading");
    setError(null);
    try {
      const exec = await api.uploadVideo(base, file, caseId.trim() || null, (frac) =>
        setUploadPct(Math.round(frac * 100)),
      );
      setPhase("processing");
      pollRef.current = window.setInterval(async () => {
        try {
          const s = await api.getTaskStatus(base, exec.task_id);
          setStatus(s);
          if (s.status === "completed" || s.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            if (s.status === "failed") {
              setPhase("error");
              setError(s.message || "Processing failed.");
              return;
            }
            const finalCaseId = exec.case_id || caseId.trim() || null;
            let hasPendingMatches = false;
            if (finalCaseId) {
              try {
                const matches = await api.getSpeakerMatches(base, finalCaseId);
                hasPendingMatches = matches.pending.length > 0;
              } catch {
                /* non-fatal */
              }
            }
            onUploadComplete(finalCaseId, hasPendingMatches);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase("error");
          setError("Lost connection while processing.");
        }
      }, 2000);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="animate-fade-in w-full max-w-md rounded-2xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--lr-border)] px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight text-[var(--lr-text)]">
            Upload evidence video
          </h2>
          {!isWorking && (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[var(--lr-text-faint)] hover:bg-[var(--lr-bg-subtle)] hover:text-[var(--lr-text-muted)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-5 py-4">
          {phase === "idle" && (
            <>
              <label className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-[var(--lr-text-muted)]">
                <FolderOpen className="h-3.5 w-3.5" />
                Case ID
                <span className="font-normal text-[var(--lr-text-faint)]">
                  (group videos from the same trial for contradiction detection)
                </span>
              </label>
              <input
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="e.g., trial_001 (leave empty for auto-generated)"
                className="mb-4 w-full rounded-lg border border-[var(--lr-border)] bg-[var(--lr-bg)] px-3 py-2 text-sm text-[var(--lr-text)] outline-none placeholder:text-[var(--lr-text-faint)] focus:border-[var(--lr-accent)]"
              />

              {!file ? (
                <div
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pickFile(e.dataTransfer.files[0] ?? null);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
                    dragging
                      ? "border-[var(--lr-brand)] bg-[var(--lr-brand-soft)]"
                      : "border-[var(--lr-border-strong)] hover:bg-[var(--lr-bg-subtle)]"
                  }`}
                >
                  <UploadCloud className="mb-1 h-5 w-5 text-[var(--lr-text-faint)]" />
                  <p className="text-sm font-medium text-[var(--lr-text)]">
                    Drag &amp; drop your video here
                  </p>
                  <p className="text-xs text-[var(--lr-text-faint)]">
                    or click to browse · MP4, AVI, MOV, MKV · Max 500MB
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg)] px-3 py-2.5">
                  <Video className="h-5 w-5 shrink-0 text-[var(--lr-accent)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--lr-text)]">{file.name}</p>
                    <p className="text-xs text-[var(--lr-text-faint)]">{formatSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="shrink-0 rounded p-1 text-[var(--lr-text-faint)] hover:bg-[var(--lr-bg-subtle)] hover:text-[var(--lr-text-muted)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {phase === "uploading" && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--lr-text-muted)]">
                <span>Uploading video…</span>
                <span className="font-mono">{uploadPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--lr-bg-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--lr-accent)] transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          )}

          {phase === "processing" && (
            <div className="flex flex-col items-center py-2 text-center">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-[var(--lr-accent)]" />
              <p className="mb-1 text-sm font-medium text-[var(--lr-text)]">Processing video</p>
              <p className="mb-3 text-xs text-[var(--lr-text-muted)]">{status?.message || "Working…"}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--lr-bg-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--lr-accent)] transition-all"
                  style={{ width: `${Math.round((status?.progress ?? 0) * 100)}%` }}
                />
              </div>
              <p className="mt-1 font-mono text-[11px] text-[var(--lr-text-faint)]">
                {Math.round((status?.progress ?? 0) * 100)}%
              </p>
              {status && status.progress >= 1 && !status.captions_ready && (
                <p className="mt-2 text-[11px] italic text-[var(--lr-text-faint)]">
                  Captions still indexing in the background — some visual
                  descriptions may be incomplete until this finishes.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--lr-danger-soft)] px-3 py-2 text-xs text-[var(--lr-danger)]">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {phase === "idle" && (
          <div className="flex justify-end gap-2 border-t border-[var(--lr-border)] px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-[var(--lr-text-muted)] hover:bg-[var(--lr-bg-subtle)]"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file}
              className="rounded-lg bg-[var(--lr-brand)] px-3.5 py-1.5 text-sm font-medium text-[var(--lr-brand-contrast)] hover:bg-[var(--lr-brand-strong)] disabled:opacity-40"
            >
              Upload &amp; process
            </button>
          </div>
        )}
        {phase === "error" && (
          <div className="flex justify-end border-t border-[var(--lr-border)] px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--lr-border)] px-3.5 py-1.5 text-sm font-medium text-[var(--lr-text)] hover:bg-[var(--lr-bg-subtle)]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
