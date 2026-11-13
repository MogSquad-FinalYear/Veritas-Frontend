import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Clapperboard,
  Lock,
  User,
  Video as VideoIcon,
} from "lucide-react";
import type * as api from "../../lib/api/videorag";
import { frameUrl } from "../../lib/api/videorag";
import { formatDuration } from "../../lib/format";
import { renderMarkdown } from "../../lib/videoragMarkdown";
import { CopyButton, LrBadge, type Tone } from "../legalrag/ui";

export interface UserMessage {
  id: string;
  role: "user";
  text: string;
  imageUrl?: string | null;
  imageName?: string;
}
export interface AssistantMessage {
  id: string;
  role: "assistant";
  response: api.ChatResponse;
}
export type PendingMessage = { id: string; role: "pending" };
export type VrChatMessage = UserMessage | AssistantMessage | PendingMessage;

const SOURCE_TAG: Record<string, { label: string; tone: Tone }> = {
  caption: { label: "Caption index", tone: "info" },
  image: { label: "Visual index", tone: "brand" },
  speech: { label: "Speech index", tone: "success" },
  ocr: { label: "OCR index", tone: "neutral" },
};

const VERIFY_CONFIG: Record<string, { label: string; tone: Tone }> = {
  verified: { label: "Verified", tone: "success" },
  uncertain: { label: "Uncertain", tone: "warning" },
  unsupported: { label: "Unsupported", tone: "danger" },
  unverified: { label: "Unverified", tone: "neutral" },
};

const THINKING_STEPS = [
  "Understanding your question",
  "Searching frames, speech, and on-screen text",
  "Verifying timestamps against the footage",
  "Writing an answer with citations",
];

export function MessageBubble({
  message,
  base,
  onClipClick,
}: {
  message: VrChatMessage;
  base: string;
  onClipClick: (clip: api.VideoClip) => void;
}) {
  if (message.role === "user") return <UserBubble message={message} />;
  if (message.role === "pending") return <PendingRow />;
  return <AssistantBubble response={message.response} base={base} onClipClick={onClipClick} />;
}

function UserBubble({ message }: { message: UserMessage }) {
  return (
    <div className="flex justify-end gap-2.5">
      <div className="flex max-w-[85%] flex-col items-end gap-1.5">
        {message.imageUrl && (
          <figure className="max-w-[200px] overflow-hidden rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)]">
            <img src={message.imageUrl} alt="" className="max-h-[140px] w-full object-cover" />
            <figcaption className="truncate px-2 py-1 text-[10.5px] text-[var(--lr-text-faint)]">
              {message.imageName}
            </figcaption>
          </figure>
        )}
        <div className="rounded-2xl rounded-tr-sm bg-[var(--lr-brand)] px-4 py-2.5 text-[14px] text-[var(--lr-brand-contrast)]">
          {message.text}
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lr-bg-subtle)] text-[var(--lr-text-muted)]">
        <User className="h-4 w-4" />
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]">
      <Clapperboard className="h-4 w-4" />
    </div>
  );
}

function PendingRow() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % THINKING_STEPS.length), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-start gap-2.5">
      <Avatar />
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--lr-accent)] lr-dot-pulse" />
        <span aria-live="polite" className="text-[13px] text-[var(--lr-text-muted)]">
          {THINKING_STEPS[step]}
        </span>
      </div>
    </div>
  );
}

const CONF_TIER = (c: number): { label: string; tone: Tone } =>
  c >= 0.8 ? { label: "high", tone: "danger" } : c >= 0.6 ? { label: "medium", tone: "warning" } : { label: "low", tone: "neutral" };

const SECTION_LABEL = "text-[11px] font-medium uppercase tracking-wide text-[var(--lr-text-faint)]";

function AssistantBubble({
  response,
  base,
  onClipClick,
}: {
  response: api.ChatResponse;
  base: string;
  onClipClick: (clip: api.VideoClip) => void;
}) {
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set());
  const [showMore, setShowMore] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const validClips = response.clips.filter(
    (c) => !(c.frame_paths[0] && brokenThumbs.has(c.frame_paths[0])),
  );
  const primaryClips = validClips.slice(0, 2);
  const moreClips = validClips.slice(2);
  const verifiedCount = response.citations.filter((c) => c.verification_result === "verified").length;

  return (
    <div className="flex items-start gap-2.5">
      <Avatar />
      <div className="animate-fade-in min-w-0 max-w-[96%] rounded-2xl rounded-tl-sm border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] p-4 shadow-sm sm:p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {response.citations.length > 0 && (
            <LrBadge tone={verifiedCount === response.citations.length ? "success" : "warning"} dot>
              {verifiedCount}/{response.citations.length} verified
            </LrBadge>
          )}
          {validClips.length > 0 && (
            <LrBadge tone="brand">
              {validClips.length} {validClips.length === 1 ? "clip" : "clips"}
            </LrBadge>
          )}
          {response.contradictions.length > 0 && (
            <LrBadge tone="danger">
              {response.contradictions.length}{" "}
              {response.contradictions.length === 1 ? "contradiction" : "contradictions"}
            </LrBadge>
          )}
          <span className="ml-auto">
            <CopyButton text={response.answer} />
          </span>
        </div>

        <div
          className="msg-markdown text-[14.5px] leading-relaxed text-[var(--lr-text)]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(response.answer) }}
        />

        {response.contradictions.length > 0 && (
          <div className="mt-3 rounded-xl border border-[var(--lr-danger-line)] bg-[var(--lr-danger-soft)] px-3.5 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--lr-danger)]">
              <AlertTriangle className="h-[13px] w-[13px]" />
              Testimony contradictions detected
            </p>
            <div className="space-y-3">
              {response.contradictions.map((c, i) => {
                const tier = CONF_TIER(c.confidence);
                return (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--lr-text)]">{c.speaker_id}</span>
                      <LrBadge tone={tier.tone}>
                        {tier.label} · {Math.round(c.confidence * 100)}%
                      </LrBadge>
                    </div>
                    <div className="space-y-1 border-l-2 border-[var(--lr-danger-line)] pl-2.5">
                      <p className="text-[11px] text-[var(--lr-text-faint)]">
                        Session 1{c.timestamp_a != null && ` · [${formatDuration(c.timestamp_a)}]`}
                      </p>
                      <p className="text-[13px] italic text-[var(--lr-text-muted)]">"{c.statement_a}"</p>
                      <p className="py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--lr-text-faint)]">vs</p>
                      <p className="text-[11px] text-[var(--lr-text-faint)]">
                        Session 2{c.timestamp_b != null && ` · [${formatDuration(c.timestamp_b)}]`}
                      </p>
                      <p className="text-[13px] italic text-[var(--lr-text-muted)]">"{c.statement_b}"</p>
                    </div>
                    {c.explanation && (
                      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--lr-text-muted)]">{c.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {primaryClips.length > 0 && (
          <div className="mt-3.5 border-t border-[var(--lr-border)] pt-3.5">
            <p className={`mb-1.5 ${SECTION_LABEL}`}>Retrieved frames · {validClips.length}</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {primaryClips.map((clip, i) => (
                <ClipCard
                  key={i}
                  clip={clip}
                  index={i}
                  base={base}
                  onOpen={() => onClipClick(clip)}
                  onBroken={(path) => setBrokenThumbs((s) => new Set(s).add(path))}
                />
              ))}
            </div>

            {moreClips.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowMore((v) => !v)}
                  className="flex items-center gap-1 text-[11px] font-medium text-[var(--lr-accent)]"
                >
                  {showMore ? "Hide" : "Show"} {moreClips.length} more
                  <ChevronDown className={`h-3 w-3 transition-transform ${showMore ? "rotate-180" : ""}`} />
                </button>
                {showMore && (
                  <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {moreClips.map((clip, i) => (
                      <button
                        key={i}
                        onClick={() => onClipClick(clip)}
                        className="flex items-center gap-2 rounded-lg border border-[var(--lr-border)] p-1.5 text-left hover:border-[var(--lr-accent-line)] hover:bg-[var(--lr-bg-subtle)]"
                      >
                        {clip.frame_paths[0] && (
                          <img
                            src={frameUrl(base, clip.frame_paths[0]) ?? undefined}
                            alt=""
                            className="h-[38px] w-14 shrink-0 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-mono text-[10.5px] text-[var(--lr-accent)]">
                            {formatDuration(clip.start_time)} – {formatDuration(clip.end_time)}
                          </p>
                          {clip.description && (
                            <p className="truncate text-[10.5px] text-[var(--lr-text-faint)]">{clip.description}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {response.citations.length > 0 && (
          <div className="mt-3.5 border-t border-[var(--lr-border)] pt-3.5">
            <button
              onClick={() => setShowCitations((v) => !v)}
              className={`flex items-center gap-1 hover:text-[var(--lr-text-muted)] ${SECTION_LABEL}`}
            >
              Citations · {verifiedCount}/{response.citations.length} verified
              <ChevronDown className={`h-3 w-3 transition-transform ${showCitations ? "rotate-180" : ""}`} />
            </button>
            {showCitations && (
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                {response.citations.map((c, i) => {
                  const cfg = VERIFY_CONFIG[c.verification_result] ?? VERIFY_CONFIG.unverified;
                  return (
                    <div key={i} className="rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-[var(--lr-bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--lr-text)]">
                          {c.timestamp_text || `[${formatDuration(c.timestamp)}]`}
                        </span>
                        <LrBadge tone={cfg.tone} dot>
                          {cfg.label}
                        </LrBadge>
                        <span
                          title="Verification confidence"
                          className="ml-auto font-mono text-[10.5px] text-[var(--lr-text-faint)]"
                        >
                          {Math.round(c.verification_score * 100)}%
                        </span>
                      </div>
                      {c.explanation && (
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--lr-text)]">{c.explanation}</p>
                      )}
                      {c.clip_hash && (
                        <p
                          title={c.clip_hash}
                          className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-[var(--lr-text-faint)]"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          {c.clip_hash.slice(0, 10)}…
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {response.sources.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--lr-border)] pt-3.5">
            <span className={`mr-0.5 ${SECTION_LABEL}`}>Sources</span>
            {[...new Set(response.sources.map((s) => s.source_index))].map((idx) => {
              const tag = SOURCE_TAG[idx];
              if (!tag) return null;
              return (
                <LrBadge key={idx} tone={tag.tone}>
                  {tag.label}
                </LrBadge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ClipCard({
  clip,
  index,
  base,
  onOpen,
  onBroken,
}: {
  clip: api.VideoClip;
  index: number;
  base: string;
  onOpen: () => void;
  onBroken: (path: string) => void;
}) {
  const path = clip.frame_paths[0] ?? null;
  const src = path ? frameUrl(base, path) : null;
  return (
    <button
      onClick={onOpen}
      className="group overflow-hidden rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] text-left transition-all hover:-translate-y-0.5 hover:border-[var(--lr-accent-line)] hover:shadow-sm"
    >
      <div className="relative aspect-video max-h-[220px] overflow-hidden bg-[var(--lr-bg-subtle)]">
        {src && (
          <img
            src={src}
            alt=""
            onError={() => path && onBroken(path)}
            className="h-full w-full object-cover"
          />
        )}
        <span className="absolute left-2 top-2 rounded-md bg-[var(--lr-brand)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--lr-brand-contrast)]">
          Match {index + 1}
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {formatDuration(clip.start_time)}
        </span>
      </div>
      {clip.description && (
        <p className="border-t border-[var(--lr-border)] px-2.5 py-1.5 text-[12px] leading-snug text-[var(--lr-text)]">
          {clip.description}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--lr-border)] px-2.5 py-1.5">
        <span className="flex min-w-0 items-center gap-1 font-mono text-[10.5px] text-[var(--lr-text-faint)]">
          <VideoIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{clip.video_id}</span>
        </span>
        <span className="shrink-0 font-mono text-[10.5px] text-[var(--lr-accent)]">
          {formatDuration(clip.start_time)} – {formatDuration(clip.end_time)}
        </span>
      </div>
    </button>
  );
}
