import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FileKind = "image" | "video" | "document" | "other";

export interface StagedFile {
  id: string;
  file: File;
  kind: FileKind;
  previewUrl: string | null;
  addedAt: number;
}

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp"]);
const VIDEO_EXT = new Set(["mp4", "avi", "mov", "mkv", "webm", "flv", "wmv"]);
const DOC_EXT = new Set(["pdf", "tif", "tiff"]);

export function kindOf(file: File): FileKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "document";

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (DOC_EXT.has(ext)) return "document";
  return "other";
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface FileStoreContextValue {
  files: StagedFile[];
  addFiles: (list: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clear: () => void;
}

const FileStoreContext = createContext<FileStoreContextValue | null>(null);

export function FileStoreProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<StagedFile[]>([]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const incoming = Array.from(list).map((file) => {
      const kind = kindOf(file);
      return {
        id: makeId(),
        file,
        kind,
        previewUrl:
          kind === "image" || kind === "video"
            ? URL.createObjectURL(file)
            : null,
        addedAt: Date.now(),
      } satisfies StagedFile;
    });
    setFiles((prev) => [...incoming, ...prev]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      return [];
    });
  }, []);

  const value = useMemo(
    () => ({ files, addFiles, removeFile, clear }),
    [files, addFiles, removeFile, clear],
  );

  return (
    <FileStoreContext.Provider value={value}>
      {children}
    </FileStoreContext.Provider>
  );
}

export function useFileStore() {
  const ctx = useContext(FileStoreContext);
  if (!ctx) throw new Error("useFileStore must be used within FileStoreProvider");
  return ctx;
}
