import { request } from "../http";

export interface DetectionResult {
  filename: string;
  folder: string | null;
  flagged: boolean;
  score: number;
  detector: string;
  detector_display_name: string;
  reason: string;
  inference_ms?: number;
  error?: string;
}

export interface HealthPayload {
  ok: boolean;
  device: string;
}

export function getHealth(base: string): Promise<HealthPayload> {
  return request(base, "/health");
}

export async function detectImages(
  base: string,
  files: File[],
  folder?: string,
): Promise<DetectionResult[]> {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  if (folder) form.append("folder", folder);
  const data = await request<{ results: DetectionResult[] }>(base, "/api/detect", {
    method: "POST",
    body: form,
  });
  return data.results ?? [];
}

export async function fetchDetectionHistory(
  base: string,
): Promise<DetectionResult[]> {
  const data = await request<{ detections: DetectionResult[] }>(
    base,
    "/api/detections",
  );
  return data.detections ?? [];
}

/** Backend now serves the files it saved under /uploads/<folder?>/<filename>
 * (see cernpix-backend/app.py:uploaded_file) so past detections can show a
 * real thumbnail, not just metadata. */
export function uploadedFileUrl(
  base: string,
  filename: string,
  folder: string | null,
): string {
  const path = folder
    ? `${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`
    : encodeURIComponent(filename);
  return `${base}/uploads/${path}`;
}
