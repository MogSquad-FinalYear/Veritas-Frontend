import { useState } from "react";
import {
  FolderClosed,
  MessagesSquare,
  Plus,
  SquarePen,
  Trash2,
} from "lucide-react";
import type { CaseInfo } from "../../lib/api/legalrag";
import type { Conversation } from "../../lib/legalragHistory";
import { groupByRecency } from "../../lib/legalragHistory";
import { initials } from "./ui";
import { UploadDropzone } from "./UploadDropzone";

const CASE_ID_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

export function LegalRagSidebar({
  base,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  cases,
  activeCaseId,
  onSelectCase,
  onCreateCase,
  activeCase,
  onDocumentUploaded,
  pushToast,
}: {
  base: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: () => void;
  cases: CaseInfo[];
  activeCaseId: string | null;
  onSelectCase: (id: string | null) => void;
  onCreateCase: (id: string) => void;
  activeCase: CaseInfo | null;
  onDocumentUploaded: () => void;
  pushToast: (t: { tone: "success" | "error"; title: string; description?: string }) => void;
}) {
  const [newCaseId, setNewCaseId] = useState("");
  const [caseError, setCaseError] = useState<string | null>(null);
  const grouped = groupByRecency(conversations);

  function submitCase() {
    const id = newCaseId.trim();
    if (!id) return;
    if (!CASE_ID_PATTERN.test(id)) {
      setCaseError("Use letters, numbers, dot, dash or underscore only.");
      return;
    }
    setCaseError(null);
    onCreateCase(id);
    setNewCaseId("");
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] px-4 py-5 lg:flex">
      <button
        onClick={onNewChat}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--lr-border)] px-3 py-2 text-left text-sm font-medium text-[var(--lr-text)] hover:bg-[var(--lr-bg-subtle)]"
      >
        <SquarePen className="h-4 w-4 text-[var(--lr-text-faint)]" />
        New chat
      </button>

      <div>
        <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--lr-text-faint)]">
          History
        </p>
        {grouped.length === 0 ? (
          <p className="px-0.5 text-xs text-[var(--lr-text-faint)]">
            Your past questions will show up here once you ask one.
          </p>
        ) : (
          <div className="space-y-3">
            {grouped.map(([bucket, items]) => (
              <div key={bucket}>
                <p className="mb-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--lr-text-faint)]">
                  {bucket}
                </p>
                <div className="space-y-0.5">
                  {items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelectConversation(c.id)}
                      className={`group flex w-full items-center gap-2 rounded-md border border-l-[3px] border-transparent px-2.5 py-1.5 text-left text-[13px] ${
                        c.id === activeConversationId
                          ? "border-l-[var(--lr-accent)] bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]"
                          : "text-[var(--lr-text-muted)] hover:bg-[var(--lr-bg-subtle)]"
                      }`}
                    >
                      <MessagesSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <Trash2
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(c.id);
                        }}
                        className="h-3.5 w-3.5 shrink-0 opacity-0 hover:text-[var(--lr-danger)] group-hover:opacity-100"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--lr-text-faint)]">
          Consultation
        </p>
        <button
          onClick={() => onSelectCase(null)}
          className={`flex w-full items-center gap-2 rounded-md border border-l-[3px] border-transparent px-2.5 py-1.5 text-left text-[13px] ${
            activeCaseId === null
              ? "border-l-[var(--lr-accent)] bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]"
              : "text-[var(--lr-text-muted)] hover:bg-[var(--lr-bg-subtle)]"
          }`}
        >
          <MessagesSquare className="h-3.5 w-3.5" />
          General question
        </button>
      </div>

      <div>
        <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--lr-text-faint)]">
          Cases
        </p>
        <div className="mb-2 flex gap-1.5">
          <input
            value={newCaseId}
            onChange={(e) => setNewCaseId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCase()}
            placeholder="e.g. case-2024-118"
            className="min-w-0 flex-1 rounded-md border border-[var(--lr-border)] bg-[var(--lr-bg)] px-2.5 py-1.5 text-xs text-[var(--lr-text)] outline-none focus:border-[var(--lr-accent)]"
          />
          <button
            onClick={submitCase}
            disabled={!newCaseId.trim()}
            className="flex shrink-0 items-center justify-center rounded-md bg-[var(--lr-brand)] px-2 text-[var(--lr-brand-contrast)] disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {caseError && <p className="mb-2 text-[11px] text-[var(--lr-danger)]">{caseError}</p>}

        {cases.length === 0 ? (
          <p className="px-0.5 text-xs leading-relaxed text-[var(--lr-text-faint)]">
            No cases yet — create one to upload FIRs, charge sheets, or
            evidence and get answers grounded in that document.
          </p>
        ) : (
          <div className="space-y-0.5">
            {cases.map((c) => (
              <button
                key={c.case_id}
                onClick={() => onSelectCase(c.case_id)}
                className={`flex w-full items-center gap-2 rounded-md border border-l-[3px] border-transparent px-2.5 py-1.5 text-left text-[13px] ${
                  activeCaseId === c.case_id
                    ? "border-l-[var(--lr-accent)] bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]"
                    : "text-[var(--lr-text-muted)] hover:bg-[var(--lr-bg-subtle)]"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    activeCaseId === c.case_id
                      ? "bg-[var(--lr-brand)] text-[var(--lr-brand-contrast)]"
                      : "bg-[var(--lr-bg-subtle)] text-[var(--lr-text-faint)]"
                  }`}
                >
                  {initials(c.case_id)}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.case_id}</span>
                <span className="shrink-0 text-[11px] text-[var(--lr-text-faint)]">
                  {c.documents.length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeCaseId && (
        <div className="border-t border-[var(--lr-border)] pt-4">
          <p className="mb-2 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--lr-text-faint)]">
            <FolderClosed className="h-3.5 w-3.5" />
            Documents in {activeCaseId}
          </p>
          <div className="space-y-1.5">
            {activeCase?.documents.length ? (
              activeCase.documents.map((d, i) => (
                <div
                  key={`${d.filename}-${i}`}
                  className="rounded-md border border-[var(--lr-border)] bg-[var(--lr-bg)] px-2.5 py-1.5"
                >
                  <p className="truncate text-xs font-medium text-[var(--lr-text)]">{d.filename}</p>
                  <p className="text-[10.5px] text-[var(--lr-text-faint)]">
                    {d.doc_type} · {d.chunks_indexed} chunks
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--lr-text-faint)]">No documents yet.</p>
            )}
          </div>
          <UploadDropzone
            base={base}
            caseId={activeCaseId}
            onUploaded={onDocumentUploaded}
            pushToast={pushToast}
          />
        </div>
      )}
    </aside>
  );
}
