import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileImage,
  FolderOpen,
  ImagePlus,
  ImageUp,
} from "lucide-react";
import { useSettings } from "../lib/settings";
import * as cernpix from "../lib/api/cernpix";
import { buildGallery, type GalleryImage } from "../lib/cernpixGallery";
import { ErrorBanner } from "../components/common/ErrorBanner";

type View = "upload" | "all" | "flagged";

const TABS: { id: View; label: string; icon: typeof ImageUp }[] = [
  { id: "upload", label: "Add Images", icon: ImageUp },
  { id: "all", label: "All Files", icon: FolderOpen },
  { id: "flagged", label: "Flagged", icon: AlertTriangle },
];

export function DeepfakePage() {
  const { settings } = useSettings();
  const base = settings.cernpix;

  const [view, setView] = useState<View>("upload");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [detections, setDetections] = useState<cernpix.DetectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [missingImageIds, setMissingImageIds] = useState<Set<string>>(() => new Set());

  async function refresh() {
    setIsLoading(true);
    try {
      const data = await cernpix.fetchDetectionHistory(base);
      setDetections(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const { images: uploadedImages, folders } = useMemo(
    () => buildGallery(base, detections),
    [base, detections],
  );
  const availableUploadedImages = useMemo(
    () => uploadedImages.filter((image) => !missingImageIds.has(image.id)),
    [uploadedImages, missingImageIds],
  );
  const availableFolders = useMemo(
    () =>
      folders
        .map((folder) => ({
          ...folder,
          children: folder.children.filter((image) => !missingImageIds.has(image.id)),
        }))
        .filter((folder) => folder.children.length > 0),
    [folders, missingImageIds],
  );
  const allImages = useMemo(
    () => [...availableUploadedImages, ...availableFolders.flatMap((f) => f.children)],
    [availableUploadedImages, availableFolders],
  );
  const flaggedImages = useMemo(() => allImages.filter((i) => i.flagged), [allImages]);
  const selectedFolder = availableFolders.find((f) => f.id === selectedFolderId) ?? null;

  const visibleImages: GalleryImage[] = useMemo(() => {
    if (view === "flagged") return flaggedImages;
    if (selectedFolder) return selectedFolder.children;
    if (view === "all") return allImages;
    return availableUploadedImages;
  }, [view, selectedFolder, flaggedImages, allImages, availableUploadedImages]);

  function selectFolder(id: string) {
    setSelectedFolderId(id);
    setView("all");
  }
  function clearSelection() {
    setSelectedFolderId(null);
  }

  function handleMissingImage(imageId: string) {
    setMissingImageIds((current) => {
      if (current.has(imageId)) return current;
      const next = new Set(current);
      next.add(imageId);
      return next;
    });
    if (selectedImageId === imageId) setSelectedImageId(null);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean }>(null);
  useEffect(() => {
    const el = folderInputRef.current;
    if (el) {
      el.webkitdirectory = true;
      el.directory = true;
    }
  }, []);

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      await cernpix.detectImages(base, files);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleFolderFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const folderName = `Folder-${Date.now()}`;
    setUploading(true);
    setError(null);
    try {
      await cernpix.detectImages(base, files, folderName);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }

  const previewTitle = selectedFolder
    ? selectedFolder.name
    : view === "flagged"
      ? "Flagged media"
      : view === "all"
        ? "All files"
        : "Uploaded images";

  return (
    <div className="theme-cernpix flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--cp-border)] px-6 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-[var(--cp-muted)] p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === view && !selectedFolderId;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setView(t.id);
                  setSelectedFolderId(null);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                    : "text-[var(--cp-muted-foreground)] hover:text-[var(--cp-foreground)]"
                }`}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {view === "upload" && !selectedFolderId && (
          <>
            <div className="rounded-2xl border border-dashed border-[var(--cp-border)] bg-[var(--cp-card)] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
                >
                  <ImagePlus className="size-4" />
                  {uploading ? "Uploading…" : "Add images"}
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--cp-border)] px-4 py-2 text-sm font-medium text-[var(--cp-foreground)] hover:bg-[var(--cp-muted)] disabled:opacity-50"
                >
                  <FolderOpen className="size-4" />
                  Add folder
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFolderFiles(e.target.files)}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <StatCard label="Images" value={isLoading ? "…" : allImages.length} />
              <StatCard label="Folders" value={isLoading ? "…" : availableFolders.length} />
              <StatCard
                label="Flagged"
                value={isLoading ? "…" : flaggedImages.length}
                accent
              />
            </div>
          </>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--cp-muted-foreground)]">
                  Browse
                </p>
                <p className="text-lg font-semibold">Assets</p>
              </div>
              {selectedFolderId && (
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--cp-muted-foreground)] hover:bg-[var(--cp-muted)]"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {availableFolders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selectFolder(f.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left ${
                    selectedFolderId === f.id
                      ? "border-neutral-900 bg-neutral-900/5 dark:border-white dark:bg-white/5"
                      : "border-[var(--cp-border)] bg-[var(--cp-background)] hover:bg-[var(--cp-muted)]/50"
                  }`}
                >
                  <span className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                    <FolderOpen className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="block text-xs text-[var(--cp-muted-foreground)]">
                      {f.children.length} files
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[var(--cp-muted-foreground)]" />
                </button>
              ))}
              {folders.length === 0 && (
                <p className="px-1 text-xs text-[var(--cp-muted-foreground)]">
                  No folders yet — use "Add folder" to group an upload.
                </p>
              )}
            </div>

            {availableUploadedImages.length > 0 && !selectedFolderId && (
              <div className="mt-4 rounded-xl border border-[var(--cp-border)] bg-[var(--cp-muted)]/20 p-3">
                <p className="mb-2 text-xs font-medium text-[var(--cp-muted-foreground)]">
                  Unfiled images
                </p>
                <div className="space-y-1">
                  {availableUploadedImages.slice(0, 6).map((img) => (
                    <button
                      key={img.id}
                      onClick={() => {
                        setSelectedImageId(img.id);
                        setView("all");
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-[var(--cp-muted)]"
                    >
                      <span className="rounded-md bg-[var(--cp-muted)] p-1.5 text-[var(--cp-muted-foreground)]">
                        <FileImage className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs">{img.name}</span>
                      {img.flagged && (
                        <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-blue-400">
                          <AlertTriangle className="size-3" />
                          Flagged
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--cp-muted-foreground)]">
                  Preview
                </p>
                <p className="text-lg font-semibold">{previewTitle}</p>
              </div>
              <span className="flex items-center gap-1.5 text-sm text-[var(--cp-muted-foreground)]">
                <CheckCircle2 className="size-4 text-emerald-500" />
                {visibleImages.length} items
              </span>
            </div>

            {isLoading ? (
              <Placeholder text="Loading uploads..." />
            ) : visibleImages.length === 0 ? (
              <Placeholder text="No images available in this view." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleImages.map((img) => (
                  <Tile
                    key={img.id}
                    image={img}
                    selected={img.id === selectedImageId}
                    onSelect={() => setSelectedImageId(img.id)}
                    onMissing={() => handleMissingImage(img.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--cp-border)] bg-[var(--cp-muted)]/30 p-4">
      <p className={`text-3xl font-bold ${accent ? "text-blue-400" : ""}`}>{value}</p>
      <p className="text-sm text-[var(--cp-muted-foreground)]">{label}</p>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-[var(--cp-border)] bg-[var(--cp-muted)]/20 text-sm text-[var(--cp-muted-foreground)]">
      {text}
    </div>
  );
}

function Tile({
  image,
  selected,
  onSelect,
  onMissing,
}: {
  image: GalleryImage;
  selected: boolean;
  onSelect: () => void;
  onMissing: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group overflow-hidden rounded-xl border bg-[var(--cp-background)] text-left transition-all hover:-translate-y-0.5 hover:border-neutral-400 ${
        selected ? "border-neutral-900 ring-2 ring-neutral-900/20 dark:border-white dark:ring-white/20" : "border-[var(--cp-border)]"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--cp-muted)]">
        <img
          src={image.path}
          alt={image.name}
          loading="eager"
          onError={onMissing}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {image.flagged && (
          <>
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-blue-500/90 px-2 py-1 text-[10px] font-medium text-white">
              <AlertTriangle className="size-3" />
              Flagged
            </span>
            <div className="absolute inset-0 bg-slate-950/35 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-x-3 bottom-3 rounded-lg border border-blue-400/80 bg-slate-950/75 p-3 text-[11px] text-blue-100 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="mb-1 flex items-center gap-1 font-medium text-blue-300">
                <AlertTriangle className="size-3" />
                Flagged
              </p>
              <p>Detector: {image.detector ?? "Unknown"}</p>
              <p>Reason: {image.reason ?? "No reason recorded."}</p>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{image.name}</p>
          <p className="truncate text-xs text-[var(--cp-muted-foreground)]">
            {image.folder ?? "Root"}
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-[var(--cp-border)] bg-[var(--cp-muted)]/30 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--cp-muted-foreground)]">
          {image.flagged ? "AI" : "Safe"}
        </span>
      </div>
    </button>
  );
}
