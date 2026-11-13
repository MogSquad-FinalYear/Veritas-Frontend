import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface BackendSettings {
  cernpix: string; // Deepfake detection (Flask) — default port 8010
  legalrag: string; // Legal RAG (FastAPI)      — default port 8000
  videorag: string; // VideoRAG (FastAPI)       — default port 8001
}

const STORAGE_KEY = "veritas.settings.v1";

export const DEFAULT_SETTINGS: BackendSettings = {
  cernpix: "http://localhost:8010",
  legalrag: "http://localhost:8000",
  videorag: "http://localhost:8001",
};

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function loadSettings(): BackendSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      cernpix: normalizeUrl(parsed.cernpix || DEFAULT_SETTINGS.cernpix),
      legalrag: normalizeUrl(parsed.legalrag || DEFAULT_SETTINGS.legalrag),
      videorag: normalizeUrl(parsed.videorag || DEFAULT_SETTINGS.videorag),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsContextValue {
  settings: BackendSettings;
  updateSettings: (next: BackendSettings) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BackendSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      updateSettings: (next) =>
        setSettings({
          cernpix: normalizeUrl(next.cernpix),
          legalrag: normalizeUrl(next.legalrag),
          videorag: normalizeUrl(next.videorag),
        }),
      resetSettings: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
