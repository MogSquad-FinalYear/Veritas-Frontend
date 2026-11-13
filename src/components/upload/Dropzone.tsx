import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

export function Dropzone({
  onFiles,
  accept,
  label = "Drag & drop files here, or click to browse",
  hint,
  compact = false,
}: {
  onFiles: (files: FileList) => void;
  accept?: string;
  label?: string;
  hint?: string;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
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
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors ${
        compact ? "px-4 py-6" : "px-6 py-12"
      } ${
        dragging
          ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10"
          : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
      }`}
    >
      <UploadCloud
        className={`mb-2 text-neutral-400 ${compact ? "h-5 w-5" : "h-7 w-7"}`}
      />
      <p className={`font-medium text-neutral-700 dark:text-neutral-300 ${compact ? "text-xs" : "text-sm"}`}>
        {label}
      </p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
