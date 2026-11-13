import {
  Inbox,
  ScanEye,
  Scale,
  Clapperboard,
  Moon,
  Settings as SettingsIcon,
  Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TabId } from "../../types";
import { useSettings } from "../../lib/settings";
import { useTheme } from "../../lib/theme";
import { useHealth, type ConnState } from "../../lib/useHealth";
import { StatusDot, statusLabel } from "./StatusDot";
import * as cernpix from "../../lib/api/cernpix";
import * as legalrag from "../../lib/api/legalrag";
import * as videorag from "../../lib/api/videorag";

const NAV: { id: TabId; label: string; icon: LucideIcon; desc: string }[] = [
  { id: "upload", label: "Upload", icon: Inbox, desc: "Shared file inbox" },
  {
    id: "deepfake",
    label: "AI imagery",
    icon: ScanEye,
    desc: "Image forensics",
  },
  { id: "legalrag", label: "Legal RAG", icon: Scale, desc: "Statute Q&A" },
  {
    id: "videorag",
    label: "VideoRAG",
    icon: Clapperboard,
    desc: "Video evidence",
  },
];

export function Sidebar({
  active,
  onChange,
  onOpenSettings,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
  onOpenSettings: () => void;
}) {
  const { settings } = useSettings();
  const { mode, toggleMode } = useTheme();

  const cernpixState = useHealth(async (): Promise<ConnState> => {
    const h = await cernpix.getHealth(settings.cernpix);
    return h.ok ? "online" : "offline";
  });
  const legalragState = useHealth(async (): Promise<ConnState> => {
    const h = await legalrag.getHealth(settings.legalrag);
    if (h.status === "ready") return "online";
    if (h.status === "loading") return "degraded";
    return "offline";
  });
  const videoragState = useHealth(async (): Promise<ConnState> => {
    const h = await videorag.getHealth(settings.videorag);
    return h.status === "healthy" ? "online" : "degraded";
  });

  const services: { label: string; state: ConnState }[] = [
    { label: "Deepfake", state: cernpixState },
    { label: "Legal RAG", state: legalragState },
    { label: "VideoRAG", state: videoragState },
  ];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-neutral-800/60 bg-neutral-950 text-neutral-100">
      <div className="flex items-center gap-2.5 px-5 pb-1 pt-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
          <span className="text-sm font-extrabold tracking-tight text-neutral-950">
            V
          </span>
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-tight tracking-tight">
            Veritas
          </p>
          <p className="text-[11px] leading-tight text-neutral-500">
            Forensic suite
          </p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                isActive
                  ? "bg-white text-neutral-950"
                  : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? "text-neutral-950" : "text-neutral-400 group-hover:text-neutral-200"
                }`}
              />
              <span className="flex-1">
                <span className="block font-medium leading-tight">
                  {item.label}
                </span>
                <span
                  className={`block text-[11px] leading-tight ${
                    isActive ? "text-neutral-500" : "text-neutral-600"
                  }`}
                >
                  {item.desc}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 space-y-2 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
        <p className="px-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Connections
        </p>
        {services.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between px-0.5 text-xs"
          >
            <span className="text-neutral-300">{s.label}</span>
            <span className="flex items-center gap-1.5 text-neutral-500">
              {statusLabel[s.state]}
              <StatusDot state={s.state} />
            </span>
          </div>
        ))}
      </div>

      <div className="mx-3 mb-5 flex items-center gap-1">
        <button
          onClick={onOpenSettings}
          className="flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white"
        >
          <SettingsIcon className="h-4 w-4 text-neutral-400" />
          Settings
        </button>
        <button
          onClick={toggleMode}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-900 hover:text-white"
        >
          {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
