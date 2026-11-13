import { useState } from "react";
import { Modal } from "../components/common/Modal";
import { DEFAULT_SETTINGS, useSettings } from "../lib/settings";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [draft, setDraft] = useState(settings);

  const fields: { key: keyof typeof draft; label: string; hint: string }[] = [
    {
      key: "cernpix",
      label: "Deepfake Detection backend",
      hint: "CernPix Flask API — default port 8010",
    },
    {
      key: "legalrag",
      label: "Legal RAG backend",
      hint: "FastAPI service in legal-rag-system/backend — default port 8000",
    },
    {
      key: "videorag",
      label: "VideoRAG backend",
      hint: "FastAPI service in VideoRAG/backend — default port 8001",
    },
  ];

  return (
    <Modal
      title="Backend connections"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={() => {
              resetSettings();
              setDraft(DEFAULT_SETTINGS);
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Reset to defaults
          </button>
          <button
            onClick={() => {
              updateSettings(draft);
              onClose();
            }}
            className="rounded-lg bg-neutral-950 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          >
            Save
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Point Veritas at each backend's address. When this frontend runs on a
        different computer than the backends, use the backend machine's LAN
        IP, e.g. <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-800">http://192.168.1.20:8010</code>.
        Saved in this browser only.
      </p>
      <div className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {f.label}
            </label>
            <input
              type="text"
              value={draft[f.key]}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [f.key]: e.target.value }))
              }
              placeholder={DEFAULT_SETTINGS[f.key]}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-neutral-400">{f.hint}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
