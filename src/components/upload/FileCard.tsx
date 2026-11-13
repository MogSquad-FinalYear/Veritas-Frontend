import { FileText, Film, ImageIcon, X, File as FileIcon } from "lucide-react";
import type { StagedFile } from "../../lib/fileStore";
import { formatBytes } from "../../lib/format";

const KIND_ICON = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  other: FileIcon,
};

export function FileCard({
  entry,
  onRemove,
  selected,
  onToggleSelect,
}: {
  entry: StagedFile;
  onRemove?: (id: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const Icon = KIND_ICON[entry.kind];
  const selectable = !!onToggleSelect;

  return (
    <div
      onClick={() => onToggleSelect?.(entry.id)}
      className={`group relative flex items-center gap-3 rounded-lg border bg-white p-2.5 pr-3 dark:bg-neutral-900 transition-colors ${
        selectable ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-blue-400 ring-1 ring-blue-200 dark:ring-blue-500/30"
          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800">
        {entry.kind === "image" && entry.previewUrl ? (
          <img
            src={entry.previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon className="h-5 w-5 text-neutral-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {entry.file.name}
        </p>
        <p className="text-xs text-neutral-400">
          {formatBytes(entry.file.size)} · {entry.kind}
        </p>
      </div>
      {selectable && (
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? "border-blue-500 bg-blue-500"
              : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
          }`}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(entry.id);
          }}
          className="shrink-0 rounded-md p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
