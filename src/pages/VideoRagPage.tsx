import { useEffect, useRef, useState } from "react";
import { useSettings } from "../lib/settings";
import * as api from "../lib/api/videorag";
import { VideoRagSidebar } from "../components/videorag/Sidebar";
import { EmptyState } from "../components/videorag/EmptyState";
import { Composer } from "../components/videorag/Composer";
import { UploadModal } from "../components/videorag/UploadModal";
import { CasePanel } from "../components/videorag/CasePanel";
import { VideoPlayerPanel } from "../components/videorag/VideoPlayerPanel";
import { MessageBubble, type VrChatMessage } from "../components/videorag/MessageBubble";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function VideoRagPage() {
  const { settings } = useSettings();
  const base = settings.videorag;

  const [videos, setVideos] = useState<api.VideoInfo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const selectedVideo = videos.find((v) => v.video_id === selectedVideoId) ?? null;

  async function refreshVideos() {
    setVideosLoading(true);
    try {
      setVideos(await api.listVideos(base));
    } catch {
      /* sidebar just shows an empty library */
    } finally {
      setVideosLoading(false);
    }
  }
  useEffect(() => {
    refreshVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  function onSelectVideo(videoId: string | null, caseId: string | null) {
    setSelectedVideoId(videoId);
    setSelectedCaseId(caseId);
  }

  const [showUpload, setShowUpload] = useState(false);
  const [casePanel, setCasePanel] = useState<{ caseId: string; tab: "speakers" | "testimony" | "contradictions" } | null>(null);
  const [activeClip, setActiveClip] = useState<api.VideoClip | null>(null);

  const [messages, setMessages] = useState<VrChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [refImage, setRefImage] = useState<File | null>(null);
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function attachImage(file: File) {
    if (refImageUrl) URL.revokeObjectURL(refImageUrl);
    setRefImage(file);
    setRefImageUrl(URL.createObjectURL(file));
  }
  function clearImage() {
    if (refImageUrl) URL.revokeObjectURL(refImageUrl);
    setRefImage(null);
    setRefImageUrl(null);
  }

  function handleNewChat() {
    for (const m of messages) {
      if (m.role === "user" && m.imageUrl) URL.revokeObjectURL(m.imageUrl);
    }
    setMessages([]);
    setInput("");
    clearImage();
  }

  async function send(text: string) {
    const query = text.trim();
    if (pending || (!query && !refImage)) return;
    const attachedImage = refImage;
    const prompt = query || "Find frames similar to this image";
    setInput("");
    // Hand the attachment's object URL to the chat bubble rather than
    // revoking it — the bubble still needs to display the image.
    setRefImage(null);
    setRefImageUrl(null);
    setMessages((m) => [
      ...m,
      {
        id: uid(),
        role: "user",
        text: prompt,
        imageUrl: attachedImage ? refImageUrl : null,
        imageName: attachedImage?.name,
      },
      { id: "pending", role: "pending" },
    ]);
    setPending(true);
    try {
      const response = attachedImage
        ? await api.sendChatWithImage(base, prompt, attachedImage, selectedVideoId)
        : await api.sendChat(base, query, selectedVideoId, selectedCaseId);
      setMessages((m) => [
        ...m.filter((x) => x.id !== "pending"),
        { id: uid(), role: "assistant", response },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [
        ...m.filter((x) => x.id !== "pending"),
        {
          id: uid(),
          role: "assistant",
          response: {
            answer: `⚠️ Error: ${msg}. Make sure the backend is running.`,
            clips: [],
            sources: [],
            citations: [],
            contradictions: [],
          },
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteVideo(videoId: string) {
    await api.deleteVideo(base, videoId);
    if (selectedVideoId === videoId) onSelectVideo(null, null);
    refreshVideos();
  }

  const placeholder = refImage
    ? "Describe what to look for (optional)…"
    : selectedVideo
      ? `Ask about ${selectedVideo.filename}…`
      : "Ask about objects, speech, or moments across your videos…";

  return (
    <div className="theme-videorag flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1">
        <VideoRagSidebar
          base={base}
          videos={videos}
          loading={videosLoading}
          selectedVideoId={selectedVideoId}
          onSelectVideo={onSelectVideo}
          onNewChat={handleNewChat}
          onOpenUpload={() => setShowUpload(true)}
          onOpenCasePanel={(caseId) => setCasePanel({ caseId, tab: "speakers" })}
          onDeleteVideo={handleDeleteVideo}
        />

        <div
          className="flex min-w-0 flex-1 flex-col bg-[var(--lr-bg)]"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragging(true);
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
            if (file) attachImage(file);
          }}
        >
          {messages.length === 0 ? (
            <div className="flex-1 overflow-y-auto py-10">
              <EmptyState onPick={send} onPickImage={() => imageInputRef.current?.click()} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} base={base} onClipClick={setActiveClip} />
                ))}
                <div ref={bottomRef} />
              </div>
            </div>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) attachImage(file);
              e.target.value = "";
            }}
          />
          <Composer
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            disabled={pending}
            placeholder={placeholder}
            refImage={refImage}
            refImageUrl={refImageUrl}
            onAttachImage={() => imageInputRef.current?.click()}
            onClearImage={clearImage}
            dragging={dragging}
          />
        </div>

        {activeClip && (
          <VideoPlayerPanel clip={activeClip} base={base} onClose={() => setActiveClip(null)} />
        )}
      </div>

      {showUpload && (
        <UploadModal
          base={base}
          onClose={() => setShowUpload(false)}
          onUploadComplete={(caseId, hasPendingMatches) => {
            setShowUpload(false);
            refreshVideos();
            setSelectedCaseId(caseId);
            if (hasPendingMatches && caseId) setCasePanel({ caseId, tab: "speakers" });
          }}
        />
      )}

      {casePanel && (
        <CasePanel
          base={base}
          caseId={casePanel.caseId}
          initialTab={casePanel.tab}
          onClose={() => setCasePanel(null)}
        />
      )}
    </div>
  );
}
