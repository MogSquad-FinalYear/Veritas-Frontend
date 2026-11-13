import { FileText, Film, ImageIcon, Trash2 } from "lucide-react";
import { Dropzone } from "../components/upload/Dropzone";
import { FileCard } from "../components/upload/FileCard";
import { EmptyState } from "../components/common/EmptyState";
import { useFileStore } from "../lib/fileStore";
import type { TabId } from "../types";

export function UploadPage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { files, addFiles, removeFile, clear } = useFileStore();

  const counts = {
    image: files.filter((f) => f.kind === "image").length,
    video: files.filter((f) => f.kind === "video").length,
    document: files.filter((f) => f.kind === "document").length,
  };

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Upload
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Drop files here once — they stay available across Deepfake
          Detection, Legal RAG, and VideoRAG so you don't re-select them in
          each tool.
        </p>
      </header>

      <Dropzone
        onFiles={addFiles}
        label="Drag & drop images, videos, or documents"
        hint="JPG, PNG, WEBP · MP4, MOV, MKV, WEBM · PDF"
      />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatChip
          icon={ImageIcon}
          label="Images"
          count={counts.image}
          onClick={() => onNavigate("deepfake")}
        />
        <StatChip
          icon={Film}
          label="Videos"
          count={counts.video}
          onClick={() => onNavigate("videorag")}
        />
        <StatChip
          icon={FileText}
          label="Documents"
          count={counts.document}
          onClick={() => onNavigate("legalrag")}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Staged files ({files.length})
        </h2>
        {files.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      <div className="mt-3">
        {files.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No files staged yet"
            description="Files you drop above will show up here and stay available while you switch between tools."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {files.map((f) => (
              <FileCard key={f.id} entry={f} onRemove={removeFile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  count,
  onClick,
}: {
  icon: typeof ImageIcon;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-colors enabled:hover:border-blue-300 enabled:hover:bg-blue-50/40 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:enabled:hover:border-blue-500/40 dark:enabled:hover:bg-blue-500/5"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
          {count}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
      </div>
    </button>
  );
}
