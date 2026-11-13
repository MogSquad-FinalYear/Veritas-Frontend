import { jsonInit, request } from "../http";

export type HealthStatus = "loading" | "ready" | "error";

export interface Health {
  status: HealthStatus;
  detail: string;
}

export interface Citation {
  section_id: string;
  act_name: string;
  category: string;
  content: string;
  validity: string;
  warning: string;
}

export interface QueryResponse {
  query: string;
  answer: string;
  intent: string;
  confidence: string;
  citations: Citation[];
  warnings: string[];
  irac_summary: Record<string, number>;
  retrieved_section_ids: string[];
  case_id: string | null;
  elapsed_ms: number;
}

export interface CaseDocument {
  filename: string;
  doc_type: string;
  confidence: number;
  chunks_indexed: number;
  uploaded_at: string;
}

export interface CaseInfo {
  case_id: string;
  documents: CaseDocument[];
}

export interface UploadResponse {
  filename: string;
  case_id: string;
  document_id: string;
  doc_type: string;
  confidence: number;
  chunks_indexed: number;
  used_ocr: boolean;
  warnings: string[];
  elapsed_s: number;
}

export function getHealth(base: string): Promise<Health> {
  return request(base, "/api/health");
}

export function postQuery(
  base: string,
  query: string,
  caseId: string | null,
): Promise<QueryResponse> {
  return request(base, "/api/query", jsonInit({ query, case_id: caseId }));
}

export function uploadDocument(
  base: string,
  caseId: string,
  file: File,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  return request(base, `/api/cases/${encodeURIComponent(caseId)}/upload`, {
    method: "POST",
    body: form,
  });
}

export function listCases(base: string): Promise<CaseInfo[]> {
  return request(base, "/api/cases");
}

export function getCase(base: string, caseId: string): Promise<CaseInfo> {
  return request(base, `/api/cases/${encodeURIComponent(caseId)}`);
}
