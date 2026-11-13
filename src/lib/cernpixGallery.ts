import { uploadedFileUrl, type DetectionResult } from "./api/cernpix";

export interface GalleryImage {
  id: string;
  name: string;
  path: string;
  flagged: boolean;
  folder: string | null;
  detector?: string;
  reason?: string;
  score?: number;
}

export interface GalleryFolder {
  id: string;
  name: string;
  flagged: boolean;
  children: GalleryImage[];
}

/** Flask returns detection history newest-first with no filesystem walk to
 * fall back on — so (unlike CernPix's own Next.js server) the gallery here
 * is built entirely from what's actually been detected. Every image staged
 * through this page goes through detection first, so nothing is missed. */
export function buildGallery(
  base: string,
  detections: DetectionResult[],
): { images: GalleryImage[]; folders: GalleryFolder[] } {
  const seen = new Set<string>();
  const images: GalleryImage[] = [];
  const folderOrder: string[] = [];
  const folderMap = new Map<string, GalleryImage[]>();

  for (const d of detections) {
    if (d.error) continue;
    const key = `${d.folder ?? ""}/${d.filename}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const img: GalleryImage = {
      id: d.folder ? `folder-${d.folder}-${d.filename}` : `root-${d.filename}`,
      name: d.filename,
      path: uploadedFileUrl(base, d.filename, d.folder),
      flagged: d.flagged,
      folder: d.folder,
      detector: d.detector_display_name,
      reason: d.reason,
      score: d.score,
    };

    if (d.folder) {
      if (!folderMap.has(d.folder)) {
        folderMap.set(d.folder, []);
        folderOrder.push(d.folder);
      }
      folderMap.get(d.folder)!.push(img);
    } else {
      images.push(img);
    }
  }

  const folders: GalleryFolder[] = folderOrder.map((name) => {
    const children = folderMap.get(name)!;
    return {
      id: `folder-${name}`,
      name,
      flagged: children.some((c) => c.flagged),
      children,
    };
  });

  return { images, folders };
}
