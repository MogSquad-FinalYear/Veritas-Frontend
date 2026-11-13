import type { QueryResponse } from "./api/legalrag";

export type ChatMessage =
  | { id: string; role: "user"; text: string; caseId: string | null }
  | { id: string; role: "assistant"; answer: QueryResponse }
  | { id: string; role: "error"; text: string }
  | { id: string; role: "pending" };

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  caseId: string | null;
  updatedAt: number;
}

const STORAGE_KEY = "veritas.legalrag.conversations.v1";
const MAX_CONVERSATIONS = 50;
const TITLE_MAX_LEN = 56;

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function deriveTitle(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= TITLE_MAX_LEN) return collapsed || "New question";
  return `${collapsed.slice(0, TITLE_MAX_LEN)}…`;
}

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]) {
  try {
    const trimmed = [...list]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONVERSATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full/disabled — history just won't persist this session */
  }
}

export function upsertConversation(
  list: Conversation[],
  conv: Conversation,
): Conversation[] {
  const rest = list.filter((c) => c.id !== conv.id);
  return [conv, ...rest];
}

type Bucket = "Today" | "Yesterday" | "Previous 7 days" | "Older";

function bucketOf(updatedAt: number, now: number): Bucket {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const today = startOfDay(now);
  const day = startOfDay(updatedAt);
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "Previous 7 days";
  return "Older";
}

export function groupByRecency(
  conversations: Conversation[],
): [Bucket, Conversation[]][] {
  const now = Date.now();
  const order: Bucket[] = ["Today", "Yesterday", "Previous 7 days", "Older"];
  const groups = new Map<Bucket, Conversation[]>();
  for (const c of [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const b = bucketOf(c.updatedAt, now);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)!.push(c);
  }
  return order.filter((b) => groups.has(b)).map((b) => [b, groups.get(b)!]);
}
