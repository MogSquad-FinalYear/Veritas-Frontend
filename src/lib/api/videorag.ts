import { jsonInit, request } from "../http";

export interface ExecuteResponse {
  task_id: string;
  status: string;
  message: string;
  case_id: string | null;
}

export interface TaskStatus {
  task_id: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  message: string;
  video_id: string | null;
  captions_ready: boolean;
}

export interface VideoInfo {
  video_id: string;
  filename: string;
  duration: number | null;
  resolution: string | null;
  fps: number | null;
  frame_count: number | null;
  status: string;
  uploaded_at: string | null;
  thumbnail: string | null;
  captions_ready: boolean;
  case_id: string | null;
}

export interface SearchResult {
  video_id: string;
  frame_number: number | null;
  timestamp: number | null;
  start_time: number | null;
  end_time: number | null;
  score: number;
  content: string;
  frame_path: string | null;
  source_index: string;
}

export interface VideoClip {
  video_id: string;
  start_time: number;
  end_time: number;
  frame_paths: string[];
  description: string;
}

export interface CitationVerification {
  citation_id: string;
  timestamp: number;
  timestamp_text: string;
  verification_score: number;
  verification_result: "verified" | "uncertain" | "unsupported" | "unverified";
  explanation: string;
  clip_hash: string;
}

export interface ContradictionResult {
  contradiction_id: string;
  speaker_id: string;
  statement_a: string;
  statement_b: string;
  confidence: number;
  explanation: string;
  video_a: string | null;
  video_b: string | null;
  timestamp_a: number | null;
  timestamp_b: number | null;
}

export interface ChatResponse {
  answer: string;
  clips: VideoClip[];
  sources: SearchResult[];
  citations: CitationVerification[];
  contradictions: ContradictionResult[];
}

export interface HealthPayload {
  status: string;
  indexes: Record<string, unknown>;
}

export interface SpeakerRoleEntry {
  speaker_id: string;
  role: "judge" | "witness" | "counsel" | "unknown" | string;
  label: string;
}

export interface SpeakerMatch {
  video_id: string;
  local_speaker_id: string;
  canonical_name: string;
  confidence: number;
  role: string;
  confirmed_by_user: boolean;
}

export interface CaseSpeaker {
  canonical_name: string;
  role: string;
}

export interface SpeakerMatchesPayload {
  case_id: string;
  pending: SpeakerMatch[];
  all_speakers: CaseSpeaker[];
}

export interface TestimonyStatement {
  id: string;
  session_id: string;
  video_id: string;
  speaker_id: string;
  role: string;
  timestamp: number;
  text: string;
  created_at: string;
}

export interface CaseContradiction {
  id: string;
  case_id: string;
  speaker_id: string;
  stmt_a_id: string;
  stmt_a_text: string;
  stmt_a_timestamp: number;
  stmt_a_video_id: string;
  stmt_b_id: string;
  stmt_b_text: string;
  stmt_b_timestamp: number;
  stmt_b_video_id: string;
  confidence: number;
  explanation: string;
  detected_at: string;
}

export function getHealth(base: string): Promise<HealthPayload> {
  return request(base, "/health");
}

export function uploadVideo(
  base: string,
  file: File,
  caseId: string | null,
  onProgress?: (fraction: number) => void,
): Promise<ExecuteResponse> {
  const form = new FormData();
  form.append("file", file);
  if (caseId) form.append("case_id", caseId);

  if (!onProgress) {
    return request(base, "/execute", { method: "POST", body: form });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/execute`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`));
      }
    };
    xhr.onerror = () =>
      reject(new Error(`Can't reach ${base}. Check Settings and the network.`));
    xhr.send(form);
  });
}

export function getTaskStatus(base: string, taskId: string): Promise<TaskStatus> {
  return request(base, `/status/${taskId}`);
}

export function listVideos(base: string): Promise<VideoInfo[]> {
  return request(base, "/videos");
}

export function deleteVideo(
  base: string,
  videoId: string,
): Promise<{ status: string; video_id: string; deleted: string[] }> {
  return request(base, `/videos/${videoId}`, { method: "DELETE" });
}

export function sendChat(
  base: string,
  query: string,
  videoId: string | null,
  caseId: string | null,
): Promise<ChatResponse> {
  return request(
    base,
    "/chat",
    jsonInit({ query, video_id: videoId, case_id: caseId }),
  );
}

export function sendChatWithImage(
  base: string,
  query: string,
  image: File,
  videoId: string | null,
): Promise<ChatResponse> {
  const form = new FormData();
  form.append("query", query);
  form.append("image", image);
  if (videoId) form.append("video_id", videoId);
  return request(base, "/chat/image", { method: "POST", body: form });
}

export function getSpeakerRoles(
  base: string,
  videoId: string,
): Promise<{ video_id: string; speakers: SpeakerRoleEntry[] }> {
  return request(base, `/videos/${videoId}/speakers`);
}

export function setSpeakerRoles(
  base: string,
  videoId: string,
  mappings: SpeakerRoleEntry[],
): Promise<{ video_id: string; updated: SpeakerRoleEntry[] }> {
  return request(base, `/videos/${videoId}/speakers`, jsonInit({ mappings }));
}

export function getSpeakerMatches(
  base: string,
  caseId: string,
): Promise<SpeakerMatchesPayload> {
  return request(base, `/cases/${encodeURIComponent(caseId)}/speaker-matches`);
}

export function confirmSpeakerMatch(
  base: string,
  caseId: string,
  payload: {
    video_id: string;
    local_speaker_id: string;
    action: "confirm" | "rename";
    corrected_name?: string;
    role?: string;
  },
): Promise<{ case_id: string; result: unknown }> {
  return request(
    base,
    `/cases/${encodeURIComponent(caseId)}/speaker-matches/confirm`,
    jsonInit(payload),
  );
}

export function getCaseTestimony(
  base: string,
  caseId: string,
): Promise<{ case_id: string; total_statements: number; statements: TestimonyStatement[] }> {
  return request(base, `/cases/${encodeURIComponent(caseId)}/testimony`);
}

export function getCaseContradictions(
  base: string,
  caseId: string,
): Promise<{ case_id: string; total_contradictions: number; contradictions: CaseContradiction[] }> {
  return request(base, `/cases/${encodeURIComponent(caseId)}/contradictions`);
}

/** Frame paths in API responses are backend-local filesystem paths (the
 * backend and frontend run on different machines). Only the last two
 * segments — video_id/frame_file — match the static mount at /frames, so
 * rebuild the URL from those instead of trusting the raw path. */
export function frameUrl(base: string, framePath: string | null): string | null {
  if (!framePath) return null;
  const parts = framePath.split(/[/\\]/).filter(Boolean);
  if (parts.length < 2) return null;
  const [videoId, fileName] = parts.slice(-2);
  return `${base}/frames/${videoId}/${fileName}`;
}

export function videoPlayUrl(
  base: string,
  videoId: string,
  clip?: { start: number; end?: number },
): string {
  const url = `${base}/videos/${videoId}/play`;
  if (!clip) return url;
  return `${url}#t=${clip.start},${clip.end ?? clip.start + 5}`;
}
