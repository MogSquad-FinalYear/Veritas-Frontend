import { useEffect, useRef, useState } from "react";
import { useSettings } from "../lib/settings";
import * as api from "../lib/api/legalrag";
import {
  type ChatMessage,
  type Conversation,
  deriveTitle,
  loadConversations,
  saveConversations,
  uid,
  upsertConversation,
} from "../lib/legalragHistory";
import { useToasts, ToastStack } from "../lib/toast";
import { LegalRagSidebar } from "../components/legalrag/Sidebar";
import { EmptyState } from "../components/legalrag/EmptyState";
import { MessageRow } from "../components/legalrag/MessageRow";
import { Composer } from "../components/legalrag/Composer";
import { HealthPill } from "../components/legalrag/HealthPill";

export function LegalRagPage() {
  const { settings } = useSettings();
  const base = settings.legalrag;
  const { toasts, push: pushToast, dismiss } = useToasts();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  useEffect(() => {
    setConversations(loadConversations());
    setHistoryLoaded(true);
  }, []);
  useEffect(() => {
    if (historyLoaded) saveConversations(conversations);
  }, [conversations, historyLoaded]);

  const [cases, setCases] = useState<api.CaseInfo[]>([]);
  const [localCaseIds, setLocalCaseIds] = useState<string[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<api.CaseInfo | null>(null);

  async function refreshCases() {
    try {
      const server = await api.listCases(base);
      const known = new Set(server.map((c) => c.case_id));
      const extra = localCaseIds
        .filter((id) => !known.has(id))
        .map((id) => ({ case_id: id, documents: [] as api.CaseDocument[] }));
      setCases([...server, ...extra]);
    } catch {
      /* backend may not be ready yet — HealthPill already reflects this */
    }
  }
  useEffect(() => {
    refreshCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, localCaseIds]);

  useEffect(() => {
    if (!activeCaseId) {
      setActiveCase(null);
      return;
    }
    api
      .getCase(base, activeCaseId)
      .then(setActiveCase)
      .catch(() => setActiveCase({ case_id: activeCaseId, documents: [] }));
  }, [activeCaseId, base]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const convIdRef = useRef(uid());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function handleNewChat() {
    convIdRef.current = uid();
    setActiveConversationId(null);
    setMessages([]);
  }

  function handleSelectConversation(id: string) {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    convIdRef.current = conv.id;
    setActiveConversationId(conv.id);
    setMessages(conv.messages);
    setActiveCaseId(conv.caseId);
  }

  function handleDeleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeConversationId) handleNewChat();
  }

  function persist(nextMessages: ChatMessage[], caseId: string | null) {
    const firstUser = nextMessages.find((m) => m.role === "user");
    if (!firstUser || firstUser.role !== "user") return;
    const conv: Conversation = {
      id: convIdRef.current,
      title: deriveTitle(firstUser.text),
      messages: nextMessages,
      caseId,
      updatedAt: Date.now(),
    };
    setConversations((prev) => upsertConversation(prev, conv));
    setActiveConversationId(conv.id);
  }

  async function send(query: string) {
    const text = query.trim();
    if (!text || sending) return;
    setInput("");
    const withUser: ChatMessage[] = [
      ...messages,
      { id: uid(), role: "user", text, caseId: activeCaseId },
      { id: "pending", role: "pending" },
    ];
    setMessages(withUser);
    persist(withUser, activeCaseId);
    setSending(true);
    try {
      const answer = await api.postQuery(base, text, activeCaseId);
      const next: ChatMessage[] = [
        ...withUser.filter((m) => m.id !== "pending"),
        { id: uid(), role: "assistant", answer },
      ];
      setMessages(next);
      persist(next, activeCaseId);
    } catch (e) {
      const next: ChatMessage[] = [
        ...withUser.filter((m) => m.id !== "pending"),
        { id: uid(), role: "error", text: e instanceof Error ? e.message : String(e) },
      ];
      setMessages(next);
      persist(next, activeCaseId);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="theme-legalrag flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        <LegalRagSidebar
          base={base}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onNewChat={handleNewChat}
          cases={cases}
          activeCaseId={activeCaseId}
          onSelectCase={setActiveCaseId}
          onCreateCase={(id) => {
            setLocalCaseIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
            setActiveCaseId(id);
          }}
          activeCase={activeCase}
          onDocumentUploaded={() => {
            refreshCases();
            if (activeCaseId) api.getCase(base, activeCaseId).then(setActiveCase).catch(() => {});
          }}
          pushToast={pushToast}
        />

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--lr-bg)]">
          {messages.length === 0 ? (
            <div className="flex-1 overflow-y-auto py-10">
              <EmptyState onPick={send} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
                {messages.map((m) => (
                  <MessageRow key={m.id} message={m} />
                ))}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

          <Composer
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            disabled={sending}
            caseId={activeCaseId}
          />
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
