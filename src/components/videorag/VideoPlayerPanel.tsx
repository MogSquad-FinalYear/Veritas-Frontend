import { useRef } from "react";
import { PlayCircle, X } from "lucide-react";
import type * as api from "../../lib/api/videorag";
import { frameUrl, videoPlayUrl } from "../../lib/api/videorag";
import { formatDuration } from "../../lib/format";

export function VideoPlayerPanel({
  clip,
  base,
  onClose,
}: {
  clip: api.VideoClip;
  base: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <aside className="flex w-[420px] shrink-0 flex-col overflow-y-auto border-l border-[var(--lr-border)] bg-[var(--lr-bg-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--lr-text)]">
          <PlayCircle className="h-4 w-4 text-[var(--lr-accent)]" />
          Video clip
        </h2>
        <button
          id="close-player"
          onClick={onClose}
          className="rounded-md p-1 text-[var(--lr-text-faint)] hover:bg-[var(--lr-bg-subtle)] hover:text-[var(--lr-text-muted)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="aspect-video overflow-hidden rounded-xl border border-[var(--lr-border)] bg-black">
        <video
          ref={videoRef}
          key={clip.video_id + clip.start_time}
          controls
          autoPlay
          className="h-full w-full object-contain"
          src={videoPlayUrl(base, clip.video_id, { start: clip.start_time, end: clip.end_time })}
        />
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <Row label="Video ID" value={clip.video_id} mono />
        <Row
          label="Time range"
          value={`${formatDuration(clip.start_time)} – ${formatDuration(clip.end_time)}`}
          mono
          accent
        />
        {clip.description && <Row label="Description" value={clip.description} />}
      </div>

      {clip.frame_paths.length > 0 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {clip.frame_paths.map((p, i) => {
            const src = frameUrl(base, p);
            if (!src) return null;
            const m = p.match(/frame_(\d+)/);
            const ts = m ? Number(m[1]) : clip.start_time;
            return (
              <button
                key={i}
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = ts;
                    videoRef.current.play();
                  }
                }}
                className="h-9 w-14 shrink-0 overflow-hidden rounded border border-[var(--lr-border)] hover:border-[var(--lr-accent)]"
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function Row({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-[var(--lr-text-faint)]">{label}</p>
      <p
        className={`${mono ? "font-mono" : ""} ${accent ? "text-[var(--lr-accent)]" : "text-[var(--lr-text-muted)]"}`}
      >
        {value}
      </p>
    </div>
  );
}
