import { useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { SettingsProvider } from "./lib/settings";
import { FileStoreProvider } from "./lib/fileStore";
import { ThemeProvider } from "./lib/theme";
import { UploadPage } from "./pages/UploadPage";
import { DeepfakePage } from "./pages/DeepfakePage";
import { LegalRagPage } from "./pages/LegalRagPage";
import { VideoRagPage } from "./pages/VideoRagPage";
import { SettingsModal } from "./pages/SettingsPage";
import type { TabId } from "./types";

export default function App() {
  const [tab, setTab] = useState<TabId>("upload");
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <ThemeProvider>
      <SettingsProvider>
        <FileStoreProvider>
          <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
            <Sidebar
              active={tab}
              onChange={setTab}
              onOpenSettings={() => setSettingsOpen(true)}
            />
            <main className="min-h-0 min-w-0 flex-1">
              {(tab === "upload" || tab === "deepfake") && (
                <div className="h-full overflow-y-auto">
                  {tab === "upload" && <UploadPage onNavigate={setTab} />}
                  {tab === "deepfake" && <DeepfakePage />}
                </div>
              )}
              {tab === "legalrag" && (
                <div className="h-full">
                  <LegalRagPage />
                </div>
              )}
              {tab === "videorag" && (
                <div className="h-full">
                  <VideoRagPage />
                </div>
              )}
            </main>
          </div>
          {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
        </FileStoreProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
