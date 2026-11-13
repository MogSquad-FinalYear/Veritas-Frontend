import { useEffect, useState } from "react";
import { AlertTriangle, Mic2, Users, X } from "lucide-react";
import * as api from "../../lib/api/videorag";
import { formatDuration } from "../../lib/format";
import { LrBadge, type Tone } from "../legalrag/ui";

type Tab = "speakers" | "testimony" | "contradictions";

const ROLE_OPTIONS = ["unknown", "judge", "witness", "counsel"];

const CONF_TIER = (c: number): { label: string; tone: Tone } =>
  c >= 0.8 ? { label: "high", tone: "danger" } : c >= 0.6 ? { label: "medium", tone: "warning" } : { label: "low", tone: "neutral" };

const FIELD =
  "rounded-md border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] px-2 py-1 text-xs text-[var(--lr-text)] outline-none focus:border-[var(--lr-accent)]";
const PRIMARY_BUTTON =
  "rounded-md bg-[var(--lr-brand)] px-2.5 py-1 text-xs font-medium text-[var(--lr-brand-contrast)] hover:bg-[var(--lr-brand-strong)] disabled:opacity-50";

export function CasePanel({
  base,
  caseId,
  initialTab = "speakers",
  onClose,
}: {
  base: string;
  caseId: string;
  initialTab?: Tab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [matches, setMatches] = useState<api.SpeakerMatchesPayload | null>(null);
  const [testimony, setTestimony] = useState<api.TestimonyStatement[]>([]);
  const [contradictions, setContradictions] = useState<api.CaseContradiction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [m, t, c] = await Promise.all([
        api.getSpeakerMatches(base, caseId),
        api.getCaseTestimony(base, caseId),
        api.getCaseContradictions(base, caseId),
      ]);
      setMatches(m);
      setTestimony(t.statements);
      setContradictions(c.contradictions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, caseId]);

  const videoIds = [...new Set(testimony.map((t) => t.video_id))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="animate-fade-in flex max-h-[85vh] w-full max-w-[720px] flex-col rounded-2xl border border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--lr-border)] px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight text-[var(--lr-text)]">Case: {caseId}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--lr-text-faint)] hover:bg-[var(--lr-bg-subtle)] hover:text-[var(--lr-text-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-[var(--lr-border)] px-3">
          <TabButton icon={Users} label="Speakers" active={tab === "speakers"} onClick={() => setTab("speakers")} badge={matches?.pending.length} badgeTone="warning" />
          <TabButton icon={Mic2} label={`Testimony (${testimony.length})`} active={tab === "testimony"} onClick={() => setTab("testimony")} />
          <TabButton icon={AlertTriangle} label="Contradictions" active={tab === "contradictions"} onClick={() => setTab("contradictions")} badge={contradictions.length || undefined} badgeTone="danger" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--lr-danger-soft)] px-3 py-2 text-xs text-[var(--lr-danger)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          {loading && !matches ? (
            <p className="py-8 text-center text-sm text-[var(--lr-text-faint)]">Loading…</p>
          ) : (
            <>
              {tab === "speakers" && matches && (
                <SpeakersTab base={base} caseId={caseId} matches={matches} videoIds={videoIds} onChanged={refresh} />
              )}
              {tab === "testimony" && <TestimonyTab statements={testimony} />}
              {tab === "contradictions" && <ContradictionsTab contradictions={contradictions} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  badgeTone,
}: {
  icon: typeof Users;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  badgeTone?: "warning" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium ${
        active
          ? "border-[var(--lr-accent)] text-[var(--lr-text)]"
          : "border-transparent text-[var(--lr-text-faint)] hover:text-[var(--lr-text-muted)]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {!!badge && (
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
            badgeTone === "danger"
              ? "bg-[var(--lr-danger-soft)] text-[var(--lr-danger)]"
              : "bg-[var(--lr-warning-soft)] text-[var(--lr-warning)]"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SpeakersTab({
  base,
  caseId,
  matches,
  videoIds,
  onChanged,
}: {
  base: string;
  caseId: string;
  matches: api.SpeakerMatchesPayload;
  videoIds: string[];
  onChanged: () => void;
}) {
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [correctedName, setCorrectedName] = useState("");
  const [correctedRole, setCorrectedRole] = useState("unknown");
  const [videoForRoles, setVideoForRoles] = useState("");
  const [videoRoles, setVideoRoles] = useState<api.SpeakerRoleEntry[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  function matchKey(m: api.SpeakerMatch) {
    return `${m.video_id}::${m.local_speaker_id}`;
  }

  async function confirm(m: api.SpeakerMatch) {
    await api.confirmSpeakerMatch(base, caseId, {
      video_id: m.video_id,
      local_speaker_id: m.local_speaker_id,
      action: "confirm",
    });
    onChanged();
  }

  async function saveCorrection(m: api.SpeakerMatch) {
    if (!correctedName.trim()) return;
    await api.confirmSpeakerMatch(base, caseId, {
      video_id: m.video_id,
      local_speaker_id: m.local_speaker_id,
      action: "rename",
      corrected_name: correctedName.trim(),
      role: correctedRole,
    });
    setCorrecting(null);
    setCorrectedName("");
    onChanged();
  }

  async function loadVideoRoles(videoId: string) {
    setVideoForRoles(videoId);
    if (!videoId) {
      setVideoRoles([]);
      return;
    }
    const res = await api.getSpeakerRoles(base, videoId);
    setVideoRoles(res.speakers);
  }

  async function saveVideoRoles() {
    if (!videoForRoles) return;
    setSavingRoles(true);
    try {
      await api.setSpeakerRoles(base, videoForRoles, videoRoles);
    } finally {
      setSavingRoles(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-0.5 text-sm font-semibold text-[var(--lr-text)]">Pending voiceprint matches</p>
        <p className="mb-2.5 text-[11px] text-[var(--lr-text-faint)]">
          A matched speaker must be confirmed before it's trusted for cross-session contradiction detection.
        </p>
        {matches.pending.length === 0 ? (
          <p className="text-xs text-[var(--lr-text-faint)]">No pending matches — everything confirmed.</p>
        ) : (
          <div className="space-y-2">
            {matches.pending.map((m) => (
              <div key={matchKey(m)} className="rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg)] p-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-[var(--lr-text)]">{m.canonical_name}</span>
                  <LrBadge tone="neutral">{m.role}</LrBadge>
                </div>
                <p className="mt-0.5 text-[10.5px] text-[var(--lr-text-faint)]">
                  video <code>{m.video_id}</code> · local speaker <code>{m.local_speaker_id}</code> ·{" "}
                  {m.confidence > 0 ? `${Math.round(m.confidence * 100)}%` : "newly registered"}
                </p>
                {correcting === matchKey(m) ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <input
                      list="known-speakers"
                      value={correctedName}
                      onChange={(e) => setCorrectedName(e.target.value)}
                      placeholder="Correct name"
                      className={`min-w-0 flex-1 ${FIELD}`}
                    />
                    <select value={correctedRole} onChange={(e) => setCorrectedRole(e.target.value)} className={FIELD}>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button onClick={() => saveCorrection(m)} className={PRIMARY_BUTTON}>
                      Save
                    </button>
                    <button
                      onClick={() => setCorrecting(null)}
                      className="rounded-md px-2 py-1 text-xs text-[var(--lr-text-faint)] hover:text-[var(--lr-text-muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => confirm(m)} className={PRIMARY_BUTTON}>
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setCorrecting(matchKey(m));
                        setCorrectedName(m.canonical_name);
                        setCorrectedRole(m.role);
                      }}
                      className="rounded-md border border-[var(--lr-border)] px-2.5 py-1 text-xs text-[var(--lr-text-muted)] hover:bg-[var(--lr-bg-subtle)]"
                    >
                      Correct…
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <datalist id="known-speakers">
        {matches.all_speakers.map((s) => (
          <option key={s.canonical_name} value={s.canonical_name} />
        ))}
      </datalist>

      <div>
        <p className="mb-2 text-sm font-semibold text-[var(--lr-text)]">Known speakers in case</p>
        {matches.all_speakers.length === 0 ? (
          <p className="text-xs text-[var(--lr-text-faint)]">No speakers registered yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {matches.all_speakers.map((s) => (
              <span key={s.canonical_name} className="rounded-md bg-[var(--lr-bg-subtle)] px-2.5 py-1 text-xs text-[var(--lr-text)]">
                {s.canonical_name} <span className="text-[var(--lr-text-faint)]">· {s.role}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-[var(--lr-text)]">Edit speaker roles for a video</p>
        <select
          value={videoForRoles}
          onChange={(e) => loadVideoRoles(e.target.value)}
          className={`mb-2 w-full py-1.5 ${FIELD}`}
        >
          <option value="">Select a video…</option>
          {videoIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
        {videoForRoles && (
          <>
            {videoRoles.length === 0 ? (
              <p className="text-xs text-[var(--lr-text-faint)]">No speakers tagged for this video yet.</p>
            ) : (
              <div className="space-y-1.5">
                {videoRoles.map((r, i) => (
                  <div key={r.speaker_id} className="flex items-center gap-1.5">
                    <code className="w-24 shrink-0 truncate text-[11px] text-[var(--lr-text-faint)]">{r.speaker_id}</code>
                    <select
                      value={r.role}
                      onChange={(e) => {
                        const next = [...videoRoles];
                        next[i] = { ...r, role: e.target.value };
                        setVideoRoles(next);
                      }}
                      className={FIELD}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <input
                      value={r.label}
                      onChange={(e) => {
                        const next = [...videoRoles];
                        next[i] = { ...r, label: e.target.value };
                        setVideoRoles(next);
                      }}
                      placeholder="Label"
                      className={`min-w-0 flex-1 ${FIELD}`}
                    />
                  </div>
                ))}
                <button onClick={saveVideoRoles} disabled={savingRoles} className={`mt-1 ${PRIMARY_BUTTON}`}>
                  {savingRoles ? "Saving…" : "Save roles"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TestimonyTab({ statements }: { statements: api.TestimonyStatement[] }) {
  if (statements.length === 0) {
    return <p className="text-xs text-[var(--lr-text-faint)]">No testimony stored for this case yet.</p>;
  }
  const sorted = [...statements].sort((a, b) => a.timestamp - b.timestamp);
  return (
    <div className="space-y-2">
      {sorted.map((s) => (
        <div key={s.id} className="rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--lr-text-faint)]">
            <span className="font-semibold text-[var(--lr-text)]">
              {s.role !== "unknown" ? s.role : s.speaker_id}
            </span>
            <code className="rounded bg-[var(--lr-bg-subtle)] px-1 py-0.5">{s.speaker_id}</code>
            <span className="rounded bg-[var(--lr-bg-subtle)] px-1 py-0.5 font-mono">
              [{formatDuration(s.timestamp)}]
            </span>
            <code>{s.video_id}</code>
          </div>
          <p className="mt-1 text-[13px] italic text-[var(--lr-text-muted)]">"{s.text}"</p>
        </div>
      ))}
    </div>
  );
}

function ContradictionsTab({ contradictions }: { contradictions: api.CaseContradiction[] }) {
  if (contradictions.length === 0) {
    return <p className="text-xs text-[var(--lr-text-faint)]">No contradictions detected for this case.</p>;
  }
  return (
    <div className="space-y-3">
      {contradictions.map((c) => {
        const tier = CONF_TIER(c.confidence);
        return (
          <div key={c.id} className="rounded-xl border border-[var(--lr-border)] bg-[var(--lr-bg)] p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--lr-text)]">{c.speaker_id}</span>
              <LrBadge tone={tier.tone}>
                {tier.label} · {Math.round(c.confidence * 100)}%
              </LrBadge>
            </div>
            <div className="space-y-1 border-l-2 border-[var(--lr-danger-line)] pl-2.5">
              <p className="text-[11px] text-[var(--lr-text-faint)]">
                Session 1 · [{formatDuration(c.stmt_a_timestamp)}] · {c.stmt_a_video_id}
              </p>
              <p className="text-[13px] italic text-[var(--lr-text-muted)]">"{c.stmt_a_text}"</p>
              <p className="py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--lr-text-faint)]">vs</p>
              <p className="text-[11px] text-[var(--lr-text-faint)]">
                Session 2 · [{formatDuration(c.stmt_b_timestamp)}] · {c.stmt_b_video_id}
              </p>
              <p className="text-[13px] italic text-[var(--lr-text-muted)]">"{c.stmt_b_text}"</p>
            </div>
            {c.explanation && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--lr-text-muted)]">{c.explanation}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
