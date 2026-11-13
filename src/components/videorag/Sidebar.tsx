import { useState } from "react";
import { Film, FolderOpen, Search, SquarePen, UploadCloud, X } from "lucide-react";
import * as api from "../../lib/api/videorag";
import { StatusBadge } from "./StatusBadge";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoRagSidebar({
  base,
  videos,
  loading,
  selectedVideoId,
  onSelectVideo,
  onNewChat,
  onOpenUpload,
  onOpenCasePanel,
  onDeleteVideo,
}: {
  base: string;
  videos: api.VideoInfo[];
  loading: boolean;
  selectedVideoId: string | null;
  onSelectVideo: (videoId: string | null, caseId: string | null) => void;
  onNewChat: () => void;
  onOpenUpload: () => void;
  onOpenCasePanel: (caseId: string) => void;
  onDeleteVideo: (videoId: string) => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, videoId: string) {
    e.stopPropagation();
    if (!window.confirm("Delete this video and all its indexed data?")) return;
    setDeletingId(videoId);
    try {
      await onDeleteVideo(videoId);
    } catch {
      window.alert("Failed to delete video. Is the backend running?");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] px-4 py-5 lg:flex">
      <div className="space-y-2">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--lr-border)] px-3 py-2 text-left text-sm font-medium text-[var(--lr-text)] hover:bg-[var(--lr-bg-subtle)]"
        >
          <SquarePen className="h-4 w-4 text-[var(--lr-text-faint)]" />
          New chat
        </button>
        <button
          id="upload-button"
          onClick={onOpenUpload}
          className="flex w-full items-center gap-2 rounded-lg bg-[var(--lr-brand)] px-3 py-2 text-left text-sm font-medium text-[var(--lr-brand-contrast)] hover:bg-[var(--lr-brand-strong)]"
        >
          <UploadCloud className="h-4 w-4" />
          Upload evidence
        </button>
      </div>

      <div>
        <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--lr-text-faint)]">
          Scope
        </p>
        <button
          onClick={() => onSelectVideo(null, null)}
          className={`flex w-full items-center gap-2 rounded-md border border-l-[3px] border-transparent px-2.5 py-1.5 text-left text-[13px] ${
            selectedVideoId === null
              ? "border-l-[var(--lr-accent)] bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]"
              : "text-[var(--lr-text-muted)] hover:bg-[var(--lr-bg-subtle)]"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          All videos
        </button>
      </div>

      <div>
        <p className="mb-1.5 flex items-center justify-between px-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--lr-text-faint)]">
          Evidence library
          <span className="font-medium tracking-normal">{videos.length}</span>
        </p>

        {loading && videos.length === 0 ? (
          <p className="flex items-center gap-2 px-0.5 text-xs text-[var(--lr-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--lr-accent)] lr-dot-pulse" />
            Loading videos…
          </p>
        ) : videos.length === 0 ? (
          <p className="px-0.5 text-xs leading-relaxed text-[var(--lr-text-faint)]">
            No videos yet — upload evidence to index its frames, speech, and
            on-screen text for search.
          </p>
        ) : (
          <div className="space-y-0.5">
            {videos.map((v) => {
              const active = v.video_id === selectedVideoId;
              return (
                <div
                  key={v.video_id}
                  id={`video-${v.video_id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectVideo(v.video_id, v.case_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelectVideo(v.video_id, v.case_id);
                  }}
                  className={`group flex cursor-pointer items-start gap-2.5 rounded-md border border-l-[3px] border-transparent px-2 py-1.5 ${
                    active
                      ? "border-l-[var(--lr-accent)] bg-[var(--lr-brand-soft)]"
                      : "hover:bg-[var(--lr-bg-subtle)]"
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--lr-bg-subtle)]">
                    {v.thumbnail ? (
                      <img src={`${base}${v.thumbnail}`} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Film className="h-3.5 w-3.5 text-[var(--lr-text-faint)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      title={v.filename}
                      className={`truncate text-[13px] ${
                        active ? "font-medium text-[var(--lr-brand)]" : "text-[var(--lr-text)]"
                      }`}
                    >
                      {v.filename}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-[var(--lr-text-faint)]">
                      {formatDuration(v.duration)}
                      {v.resolution && ` · ${v.resolution}`}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <StatusBadge status={v.status} />
                      {v.case_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCasePanel(v.case_id!);
                          }}
                          title="Open case"
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--lr-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--lr-accent)] hover:underline"
                        >
                          <FolderOpen className="h-2.5 w-2.5" />
                          {v.case_id}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, v.video_id)}
                    title="Delete video"
                    className="shrink-0 rounded p-1 text-[var(--lr-text-faint)] opacity-0 hover:bg-[var(--lr-danger-soft)] hover:text-[var(--lr-danger)] group-hover:opacity-100"
                  >
                    {deletingId === v.video_id ? "…" : <X className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
