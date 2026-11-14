# Veritas — Complete Technical & Design Specification

This document is a complete, self-contained description of Veritas: what it
is, what it's made of, and exactly how every screen behaves. It is written
to be handed to another AI (or developer) with no other access to this
codebase, as the sole source of truth for rebuilding, porting, or extending
the UI. Every API shape, color token, and interaction below is taken
directly from the current working source — nothing here is inferred or
approximated.

---

## 1. What Veritas is

Veritas is a **frontend-only** unification shell over **three independent,
unrelated backend systems**, each a standalone forensic/legal tool that
already has its own API and (in two cases) its own standalone frontend that
Veritas reproduces faithfully rather than reskinning generically:

| Tool (Veritas name) | Standalone name | Domain | Backend stack | Default port |
|---|---|---|---|---|
| Deepfake Detection | **CernPix** | AI-generated image forensics | Flask (Python) | `8010` |
| Legal RAG | **Nyaya** | Citation-grounded Indian statute Q&A | FastAPI (Python) | `8000` |
| VideoRAG | **Kubrick** | Multimodal video evidence search | FastAPI (Python) | `8001` |

Veritas itself contributes: a left sidebar with navigation + live
per-backend health dots, a **Settings** modal to point each tool at any
backend URL at runtime (no rebuild — saved to `localStorage`), and a shared
**Upload** staging page where a file dropped once is available to any tool
that can use it.

**Critical constraint: Veritas contains zero model/inference code.** Every
piece of intelligence — image forensics, legal retrieval, video
transcription/embedding/search — lives in the three backends, which can run
on the same machine as the frontend or anywhere else on the LAN (this is
the actual deployed topology: Deepfake Detection + VideoRAG on one machine,
Legal RAG on another, pointed at each other via Settings). The frontend's
only job is calling three different HTTP APIs and rendering three visually
distinct experiences inside one shell.

---

## 2. Tech stack

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "lucide-react": "^0.469.0",
  "typescript": "^5.7.2",
  "vite": "^6.0.7",
  "tailwindcss": "^3.4.17",
  "@vitejs/plugin-react": "^4.3.4"
}
```

- No router library — a single `useState<TabId>` in `App.tsx` switches
  between four page components. No URL-based routing at all (no deep
  links, no browser back/forward support, no persisted "which tab was I
  on" — this is a real gap, see §13).
- No global state library (no Redux/Zustand/Jotai) — three small React
  Context providers (`SettingsProvider`, `FileStoreProvider`) plus
  page-local `useState`, each tool managing its own conversation/data
  state independently.
- No data-fetching library (no React Query/SWR) — hand-rolled `fetch`
  wrapper (`lib/http.ts`) plus manual `useEffect` + polling loops.
- Icons: `lucide-react` exclusively, used directly (no icon sprite system).
- Styling: Tailwind utility classes for layout/spacing/typography,
  CSS custom properties (defined in `src/styles/themes.css`) for every
  color so each of the three tool pages can carry its own independent
  palette without fighting Tailwind's config. `tailwind.config.js` sets
  `darkMode: ["selector", '[data-mode="dark"]']` — **not** Tailwind's
  default `media` strategy — because dark mode here is per-tool-page and
  manually toggled, not OS-driven, and not global across the app (the
  shell itself and the Upload page have no dark mode at all; only the
  three tool pages do, each independently).
- No test suite, no Storybook, no CI config present.

Build commands: `npm run dev -- --host` (exposes on LAN), `npm run build`
→ `tsc -b && vite build`, `npm run preview -- --host`.

---

## 3. App shell — structure, navigation, global state

### 3.1 Top-level component tree

```
<SettingsProvider>              (localStorage-backed backend URLs)
  <FileStoreProvider>           (in-memory shared file staging, cleared on reload)
    <div flex h-screen w-screen>
      <Sidebar />                (fixed 256px, always visible, dark)
      <main className="flex-1">
        {tab === "upload"   && <UploadPage />}
        {tab === "deepfake" && <DeepfakePage />}
        {tab === "legalrag" && <LegalRagPage />}
        {tab === "videorag" && <VideoRagPage />}
      </main>
    </div>
    {settingsOpen && <SettingsModal />}
  </FileStoreProvider>
</SettingsProvider>
```

`TabId = "upload" | "deepfake" | "legalrag" | "videorag"`. Upload and
Deepfake share a scrollable wrapper (`h-full overflow-y-auto`); Legal RAG
and VideoRAG each own their full-height layout (they have internal
scroll regions and fixed headers/composers, so the outer wrapper is just
`h-full`).

### 3.2 Sidebar (`components/layout/Sidebar.tsx`)

Fixed-width (`w-64`), always-dark (`bg-neutral-950 text-neutral-100`),
independent of any tool's own theme — this is intentional, the shell
chrome never changes look regardless of which tool is active.

Structure top to bottom:
1. **Brand mark**: white 32×32 rounded square with bold black "V", next to
   "Veritas" (15px semibold) / "Forensic suite" (11px, neutral-500).
2. **Nav list** (4 items, icon + label + one-line description):
   - Upload — `Inbox` icon — "Shared file inbox"
   - Deepfake Detection — `ScanEye` icon — "Image forensics"
   - Legal RAG — `Scale` icon — "Statute Q&A"
   - VideoRAG — `Clapperboard` icon — "Video evidence"
   Active item: white background, black text/icon. Inactive: neutral-300
   text, hover → neutral-900 background + white text.
3. **Connections panel** (bordered box, `bg-neutral-900/60`): one row per
   backend — Deepfake / Legal RAG / VideoRAG — each showing a text label
   (Checking…/Online/Loading/Offline) plus a colored dot
   (`StatusDot.tsx`): neutral-300 = checking, emerald-400 = online
   (with a CSS `animate-ping` halo), amber-400 = degraded, rose-400 =
   offline.
4. **Settings button** at the bottom — opens the Settings modal.

**Health polling** (`lib/useHealth.ts`): each service gets its own
`useHealth(checkFn, intervalMs=20000)` hook — a `setInterval` loop that
calls the tool-specific health check, sets state to `online`/`degraded`
on success, `offline` on any thrown error (including network failure /
CORS block / unreachable host), starts at `checking`. The three check
functions:
- CernPix: `GET /health` → `{ok: boolean, device: string}` → online iff `ok`.
- Legal RAG: `GET /api/health` → `{status: "loading"|"ready"|"error"}` →
  online iff `status === "ready"`, else degraded (note: `error` status
  still maps to "degraded" here, not "offline" — a real gap, see §13).
- VideoRAG: `GET /health` → `{status: string, indexes: {...}}` → online
  iff `status === "healthy"`, else degraded.

### 3.3 Settings modal (`pages/SettingsPage.tsx`)

A centered modal (`Modal.tsx`: backdrop blur, click-outside-to-close,
X button, slide-fade-in). Three plain text inputs, one per backend, each
with a label + one-line hint + placeholder showing the default. "Reset to
defaults" and "Save" buttons. On Save: URLs are trimmed and have trailing
slashes stripped (`normalizeUrl`), written to React state, and persisted
to `localStorage` key `veritas.settings.v1` as JSON. **No validation of
URL format, no connectivity test on save** — the sidebar's health dots are
the only feedback that a URL is wrong.

Defaults:
```
cernpix:  "http://localhost:8010"
legalrag: "http://localhost:8000"
videorag: "http://localhost:8001"
```

### 3.4 Upload page (`pages/UploadPage.tsx`) — shared staging area

Purpose: drop a file once, pick it from any tool that needs it, instead of
re-selecting per tool. **As currently implemented this is honestly closer
to a visual landing/dashboard than a working cross-tool pipe** — see the
caveat at the end of this subsection.

- Header + one `Dropzone` component (large dashed box, click-or-drag,
  accepts images/videos/documents by extension).
- Three `StatChip` buttons below it (Images → Deepfake Detection, Videos →
  VideoRAG, Documents → Legal RAG), each showing a live count and
  navigating to that tab on click (disabled/50%-opacity if count is 0).
- A grid of `FileCard`s below: thumbnail (object-cover image preview for
  images/videos via `URL.createObjectURL`, else a kind icon), filename,
  size + kind, remove (X) button. Empty state when nothing staged.
- "Clear all" link-button in the header when `files.length > 0`.

**File classification** (`lib/fileStore.tsx`, `kindOf()`): checks
`file.type` MIME prefix first (`image/*` → image, `video/*` → video,
`application/pdf` → document), falls back to extension matching
(`png/jpg/jpeg/gif/webp/bmp` → image; `mp4/avi/mov/mkv/webm/flv/wmv` →
video; `pdf/tif/tiff` → document); anything else → `"other"`.

**State**: `FileStoreProvider` holds `StagedFile[]` in plain React state —
**not persisted**, lost on page reload. Each entry: `{id, file: File, kind,
previewUrl: string|null, addedAt}`. `addFiles` prepends new entries
(newest-first); `removeFile` revokes the object URL and removes the entry;
`clear` revokes all and empties the list.

**The caveat**: nothing in `DeepfakePage`, `LegalRagPage`, or
`VideoRagPage` currently reads from `useFileStore()` to let a user *pick*
a staged file inside those tools — each tool page has its own completely
separate upload mechanism (its own dropzone/file input posting straight to
its own backend). So today, "stage a file on Upload" and "use it in
Deepfake Detection" are two disconnected actions; the Upload page's count
chips navigate you to the right tool, but you re-select the file there.
**If rebuilding this, decide explicitly whether to wire the staged files
into each tool's upload flow (the stated intent) or drop the pretense and
make Upload purely a multi-file landing dispatcher** — right now it's
visually promising a capability the code doesn't deliver.

---

## 4. Design system — four independent visual identities

Tailwind's `darkMode` is scoped to `[data-mode="dark"]` on a **wrapper
element**, not `<html>` — each tool page sets its own `data-mode="light"
| "dark"` on its own root div, independent of the other tools and of the
shell. Dark mode state per tool is a separate `localStorage` key via
`usePageTheme(storageKey)` (`veritas.cernpix.theme`,
`veritas.legalrag.theme`; VideoRAG has no light mode at all, see below).

### 4.1 Shell (Veritas's own chrome — Upload page, Sidebar, Settings, modals)

Plain Tailwind neutral/blue palette, light-only, no CSS variables:
`bg-neutral-50` page background, `bg-neutral-950` sidebar, `blue-*` as the
one accent color (used for hover states, the active-stat-chip highlight,
focus rings). No themed wrapper class — just inline Tailwind utilities
throughout `UploadPage.tsx`, `Sidebar.tsx`, `common/*`, `upload/*`.

### 4.2 CernPix — `.theme-cernpix` — neutral gallery + blue accent

Light-first, both modes defined:

```css
.theme-cernpix {
  --cp-background: #ffffff;   --cp-foreground: #0a0a0a;
  --cp-card: #ffffff;         --cp-muted: #f5f5f5;
  --cp-muted-foreground: #737373;
  --cp-border: #e5e5e5;       --cp-sidebar: #fafafa;
}
.theme-cernpix[data-mode="dark"] {
  --cp-background: #171717;   --cp-foreground: #f5f5f5;
  --cp-card: #262626;         --cp-muted: #262626;
  --cp-muted-foreground: #a3a3a3;
  --cp-border: rgba(255,255,255,0.1);
  --cp-sidebar: #171717;
}
```

Accent is plain Tailwind `blue-*` classes layered on top (not a CSS var) —
flagged badges, active tab pill, "Flagged" count. Toggle via `Sun`/`Moon`
icon button, top-right of the tab bar.

### 4.3 Legal RAG — `.theme-legalrag` — "ink & brass" letterhead

A warm, editorial, serious-document aesthetic (the "Scale"/courthouse
feel). `--lr-brand` is navy ink, `--lr-accent` is a brass/gold, body text
is a warm off-white/cream in light mode:

```css
.theme-legalrag {
  --lr-bg: #f6f4ee;            --lr-bg-elevated: #fffefb;
  --lr-bg-subtle: #ece7d9;     --lr-bg-overlay: #fffefb;
  --lr-border: #ddd6c4;        --lr-border-strong: #c7bea3;
  --lr-text: #1b1d29;          --lr-text-muted: #565a6d;
  --lr-text-faint: #85889a;
  --lr-brand: #16233f;         --lr-brand-strong: #0c1526;
  --lr-brand-soft: #e7eaf1;    --lr-brand-contrast: #f4ecd8;
  --lr-accent: #a9822f;        --lr-accent-soft: #f6efdc;
  --lr-success: #3f7a55;  --lr-success-soft: #e9f3ec;
  --lr-warning: #93601c;  --lr-warning-soft: #f7ecd9;
  --lr-danger: #9c3b3b;   --lr-danger-soft: #f6e9e7;
  --lr-info: #3c5a85;     --lr-info-soft: #e9eef5;
}
.theme-legalrag[data-mode="dark"] {
  --lr-bg: #0a0c12;            --lr-bg-elevated: #12151f;
  --lr-bg-subtle: #171a26;     --lr-bg-overlay: #191c2a;
  --lr-border: #262a3a;        --lr-border-strong: #383d52;
  --lr-text: #ece6d6;          --lr-text-muted: #9fa0ab;
  --lr-text-faint: #6c6f82;
  --lr-brand: #8ea0c9;         --lr-brand-strong: #b3c1e0;
  --lr-brand-soft: #1b2438;    --lr-brand-contrast: #0a0c12;
  --lr-accent: #d3ac66;        --lr-accent-soft: #241d0f;
  --lr-success: #5fae7c;  --lr-success-soft: #10261a;
  --lr-warning: #d9a752;  --lr-warning-soft: #2b2210;
  --lr-danger: #d97a7a;   --lr-danger-soft: #2b1616;
  --lr-info: #7ea0cc;     --lr-info-soft: #141f2f;
}
```

Typography: brand wordmark "NYAYA" and the empty-state heading use a serif
font (`font-serif` — relies on Tailwind's default serif stack, no custom
font loaded); body/chat text is the default sans stack.

Signature visual details:
- `.lr-letterhead-rule`: a 1px horizontal line under the header, gradient
  from transparent → brass (55% mix) → transparent — a literal letterhead
  rule.
- `.lr-glow`: a blurred radial gradient (brand → accent, 16% opacity,
  24px blur) positioned behind the brand mark icon — a soft halo.
- Citation validity → color mapping (`validityTone`): `active` → success
  (green), `amended` → warning (amber), `repealed`/`superseded` → danger
  (red), anything else → neutral.
- Confidence → color mapping (`confidenceTone`): `high` → success,
  `medium` → warning, `low` → danger, else neutral.

### 4.4 VideoRAG — `.theme-videorag` — dark amber forensic glassmorphism

**No light mode** — single fixed dark palette, amber/gold accent on near-
black, glass/blur panels:

```css
.theme-videorag {
  --vr-bg-primary: #0a0e1a;    --vr-bg-secondary: #111827;
  --vr-bg-tertiary: #1a2035;   --vr-bg-elevated: #1e2642;
  --vr-accent-primary: #f59e0b;   --vr-accent-secondary: #d97706;
  --vr-accent-hover: #fbbf24;     --vr-accent-subtle: rgba(245,158,11,.08);
  --vr-accent-glow: rgba(245,158,11,.15);
  --vr-border-active: rgba(245,158,11,.4);
  --vr-success: #10b981;  --vr-success-bg: rgba(16,185,129,.12);
  --vr-warning: #f59e0b;  --vr-warning-bg: rgba(245,158,11,.12);
  --vr-error: #ef4444;    --vr-error-bg: rgba(239,68,68,.12);
  --vr-info: #3b82f6;     --vr-info-bg: rgba(59,130,246,.12);
  --vr-text-primary: #f1f5f9;   --vr-text-secondary: #94a3b8;
  --vr-text-tertiary: #64748b;  --vr-text-muted: #475569;
  --vr-border: rgba(148,163,184,.1);
  --vr-border-hover: rgba(148,163,184,.2);
  --vr-glass-bg: rgba(17,24,39,.6);
  --vr-glass-border: rgba(148,163,184,.08);
}
```

`.vr-glass` utility: `background: var(--vr-glass-bg); backdrop-filter:
blur(20px); border: 1px solid var(--vr-glass-border);` — used on the
upload modal, case panel, chat assistant bubbles.

Animations: `vr-float` (4s ease-in-out infinite translateY ±8px, on the
empty-state sparkle icon), `vr-pulse-dot`/`vr-dot-bounce` (typing
indicator dots, staggered 0/0.2/0.4s delays).

Chat markdown rendering (`.msg-markdown` block, styling the output of
`lib/videoragMarkdown.ts` — see §7.6): paragraphs, `<ul>` bullet lists,
`.msg__heading` for `###` lines, inline `<code>`, and a special
`.msg__timestamp` pill style (amber background, monospace, pill shape) for
auto-detected `[m:ss]` / `[m:ss - m:ss]` tokens.

### 4.5 Shared component-level conventions across all three themes

- Confidence/severity tiering is duplicated per-tool rather than shared:
  `CONF_TIER` in both `CasePanel.tsx` and `MessageBubble.tsx` (VideoRAG)
  independently define the same `>=0.8 high / >=0.6 medium / else low`
  bucketing with near-identical color classes — a real duplication to
  collapse if rebuilding.
- Every modal across the app uses the same pattern: `fixed inset-0 z-50`,
  semi-opaque backdrop with `backdrop-blur`, click-outside to dismiss,
  explicit X button, `animate-fade-in` (translateY 4px → 0, 0.18s
  ease-out, defined globally in `index.css`).
- Badges are a recurring primitive, reimplemented three times with
  matching API shape but different token sets: shell `Badge.tsx` (6 fixed
  Tailwind tones), Legal RAG `LrBadge` (6 CSS-var tones + optional dot),
  VideoRAG has no shared badge component — pills are hand-styled inline
  per use (source tags, verification tags, confidence tiers, status
  badges each with their own literal markup).

---

## 5. Deepfake Detection page (CernPix) — full spec

### 5.1 Backend contract — `cernpix-backend/app.py` (Flask, port 8010)

```
GET  /health
  → { ok: boolean, device: string }       # device = torch device string, e.g. "cuda:0"

POST /api/detect
  multipart/form-data:
    images: File[]            (repeatable "images" field)
    folder?: string            (optional; becomes a logical grouping)
  → { results: DetectionResult[] }

GET  /api/detections?folder=<name>        (folder param optional)
  → { detections: DetectionResult[] }      # newest-first, every detection ever run

GET  /uploads/<folder?>/<filename>         # static file serving of saved uploads
  → raw image bytes (added specifically so the gallery can show real thumbnails
    of historical uploads, not just metadata — see Veritas/BACKEND_CHANGES.md item 5)
```

`DetectionResult` shape (exact, from `cernpix.ts`):
```ts
{
  filename: string;
  folder: string | null;
  flagged: boolean;
  score: number;              // 0–1, threshold for "flagged" is score > 0.2
  detector: string;           // "npr" | "universalfakedetect" | "genimagepp_cliplora"
  detector_display_name: string;
  reason: string;             // human-readable reason the rule engine picked this detector
  inference_ms?: number;
  error?: string;             // present instead of a result if processing that file failed
}
```

**Backend internals worth knowing for an accurate spec** (not exposed in
the API, but explains the `detector`/`reason` fields the UI surfaces): the
Flask app runs **three distinct forensic detector models** —
`npr` (Neighboring Pixel Relationships), `universalfakedetect` (CLIP
ViT-L/14-based), `genimagepp_cliplora` (GenImage++ CLIP-LoRA) — and a
`rule_engine.select_detector(features)` step picks **one** of the three
per image based on computed image features before running inference; the
chosen detector and its reason are returned alongside the score. Each
upload is saved to disk under `UPLOAD_DIR` (optionally inside a named
subfolder), inference runs once, and the record (including the image
path) is persisted via a local `db` module — there is no re-run/delete/
re-classify endpoint; history is append-only and read via
`/api/detections`.

### 5.2 Page structure (`pages/DeepfakePage.tsx`)

Three-tab layout (`Add Images` / `All Files` / `Flagged`) built from a
constant array, rendered as a segmented control (icon + label, active =
blue-tinted pill) in the header bar, with a light/dark toggle button at
the far right.

**Add Images tab** (default view):
- Dashed upload card: "Add images" button (dark pill, opens hidden
  `<input type=file multiple accept="image/*">`) and "Add folder" button
  (opens a **second** hidden input with `webkitdirectory`/`directory`
  attributes set imperatively via a `useEffect` ref — lets the user pick
  an entire OS folder; all images inside get uploaded together under an
  auto-generated folder name `Folder-${Date.now()}`).
- Three `StatCard`s below: Images (total count), Folders (count), Flagged
  (count, amber-highlighted number).
- Below that, **always visible regardless of tab** (not actually gated by
  the `view === "upload"` check for the split-pane section — see layout
  below): a two-column `[280px | 1fr]` grid —
  - **Left "Assets" panel**: list of folder buttons (folder icon in a blue
    chip, name, file count, chevron), "Back" button appears when a folder
    is selected (clears selection), and — only when not inside a folder —
    an "Unfiled images" mini-list (first 6 root-level images, each
    clickable to select+preview, with an inline "Flagged" tag if
    applicable).
  - **Right "Preview" panel**: title reflects current context (folder
    name / "Flagged media" / "All files" / "Uploaded images"), item count
    with a green checkmark, and a responsive image grid
    (`sm:grid-cols-2 xl:grid-cols-3`) of `Tile` components.

**All Files tab**: same split-pane grid, `visibleImages` = every
detection across all folders and unfiled images.

**Flagged tab**: same grid, filtered to `flagged === true` only.

Selecting a folder from the left panel (`selectFolder`) switches `view`
to `"all"` and scopes the right panel to that folder's children
regardless of which top tab is nominally active — folder selection
effectively overrides the tab state for what's shown.

### 5.3 `Tile` component — the core visual unit

A 4:3-aspect image card: `object-cover` thumbnail, hover → scale-105 +
lift (`-translate-y-0.5`) + border darkens. If `flagged`:
- Always-visible small red/blue "Flagged" pill, top-right of the image
  (uses blue-500, not red, despite "flagged" semantics — a deliberate
  CernPix brand choice carried over faithfully).
- **Hover-to-reveal detail card**: a dark semi-transparent overlay fades
  in over the bottom portion of the image on hover, showing "Detector:
  {name}" and "Reason: {text}" — this is the "hover-to-reveal flagged
  detail card" the README calls out as a faithfully-reproduced CernPix
  interaction.
Below the image: filename (truncated), folder name or "Root", and a small
"AI"/"Safe" badge on the right.

### 5.4 Data transformation layer (`lib/cernpixGallery.ts`)

The gallery is built **entirely from `/api/detections` on every page
load/base-URL change** — there is no separate "list all files" endpoint,
and critically **no filesystem walk fallback**: an image only appears in
the gallery if it went through `/api/detect` at least once (every file
staged through this page always does, so nothing is missed in practice,
but a file dropped directly onto the backend's `UPLOAD_DIR` outside the
app would never surface). `buildGallery()` dedupes by `folder/filename`
key, partitions into `images` (root-level) vs. `folders` (grouped, with a
synthetic `flagged` flag = true if *any* child is flagged), and builds
each image's served URL via `uploadedFileUrl()`.

### 5.5 Error/loading states

`isLoading` shows a centered "Loading uploads…" placeholder in the
preview panel. Any thrown error (including network failure) renders an
`ErrorBanner` (rose-themed, dismissible) above the main content — but
**does not block the rest of the UI**, so a dead backend still shows an
empty gallery with the error banner above it, not a full-page error state.

---

## 6. Legal RAG page (Nyaya) — full spec

### 6.1 Backend contract — `legal-rag-system/backend` (FastAPI, port 8000)

```
GET  /api/health
  → { status: "loading" | "ready" | "error", detail: string }

POST /api/query
  json: { query: string (1–4000 chars), case_id?: string | null }
  → QueryResponse  (503 if backend status != "ready"; also 503 mid-flight if it becomes unready)

POST /api/cases/{case_id}/upload
  multipart/form-data: file  (one file; .pdf/.jpg/.jpeg/.png/.tif/.tiff/.bmp only)
  → UploadResponse   (400 invalid case_id or unsupported extension,
                       413 over MAX_UPLOAD_MB,
                       503 backend not ready,
                       500 pipeline error)

GET  /api/cases
  → CaseInfo[]           # every case known server-side

GET  /api/cases/{case_id}
  → CaseInfo              (404 if unknown)
```

```ts
interface QueryResponse {
  query: string;
  answer: string;                       // may embed inline [SECTION_ID] tokens
  intent: string;                       // free-form classifier label
  confidence: "high" | "medium" | "low" | string;
  citations: Citation[];
  warnings: string[];
  irac_summary: Record<string, number>; // keys typically: issue, rule, application, conclusion; values 0–1
  retrieved_section_ids: string[];
  case_id: string | null;
  elapsed_ms: number;
}
interface Citation {
  section_id: string;
  act_name: string;
  category: string;
  content: string;
  validity: "active" | "amended" | "repealed" | "superseded" | string;
  warning: string;                      // e.g. "this section was repealed in 2019"
}
interface UploadResponse {
  filename: string; case_id: string; document_id: string;
  doc_type: "FIR" | "Charge Sheet" | "Medical Report" | "Other" | string;
  confidence: number;                   // 0–1 classifier confidence, NOT the same scale/type as QueryResponse.confidence
  chunks_indexed: number;
  used_ocr: boolean;                    // true if the PDF/image needed OCR (scanned, not text-layer)
  warnings: string[];
  elapsed_s: number;
}
interface CaseDocument { filename, doc_type, confidence, chunks_indexed, uploaded_at }
interface CaseInfo { case_id: string; documents: CaseDocument[] }
```

**Backend internals worth knowing**: this is backed by a large retrieval
pipeline (`legal-rag-system/rag/`) — hybrid lexical+semantic search over
an indexed Indian-statute corpus, a cross-encoder reranker, a document
classifier for uploaded case files (FIR / Charge Sheet / Medical Report /
Other), an intent classifier, a "section pinner" and IRAC
(Issue/Rule/Application/Conclusion) relevance scorer, and a temporal
filter that flags repealed/amended sections. All of this loads once in a
background thread at server startup (`app/state.py`); `/api/health`
reports `"loading"` until it finishes and every query-touching endpoint
503s until then. **The corpus must be pre-indexed before first run**
(`rag/README.md` → "Setup") — if it isn't, the backend process starts but
never reaches `"ready"`.

### 6.2 Page structure (`pages/LegalRagPage.tsx`)

Three-part layout: a thin header, a persistent left sidebar
(`lg:flex`, hidden on small screens), and a main chat column with its own
composer pinned to the bottom.

**Header**: brand mark ("NYAYA" in serif + "Legal Research Assistant"
label, with an active-case suffix if one is selected), separated by the
letterhead rule, `HealthPill` on the right, dark-mode toggle.

**`HealthPill`**: polls `/api/health` with a **self-adjusting cadence** —
every 2s while unreachable/loading, backs off to every 20s once
`status === "ready"` — so it doesn't hammer the backend once things are
healthy but stays responsive while waiting for a slow model load. Shows a
colored dot + label: "Backend unreachable" (danger, network-level
failure) / "Pipeline error" (danger) / "Loading models…" (warning,
pulsing dot) / "Backend ready" (success).

### 6.3 Left sidebar (`components/legalrag/Sidebar.tsx`)

Top to bottom:
1. "New chat" button — resets the conversation (new UUID, empty messages).
2. **History**, grouped by recency bucket (`Today` / `Yesterday` /
   `Previous 7 days` / `Older`, computed from `updatedAt` timestamps).
   Each row: chat-bubble icon, truncated title, trash icon (opacity-0,
   appears on row hover) to delete. Active conversation gets a left accent
   border + tinted background.
3. **Consultation** section: a single "General question" row (case_id =
   null) — always present, the default/fallback mode.
4. **Cases**: text input + "+" button to create a new case (client-side
   only until a document is actually uploaded to it — see §6.6), with
   inline validation (`/^[A-Za-z0-9_.-]{1,64}$/`, error text below the
   input on mismatch). Below: every known case as a row (circular avatar
   with 1–2-letter initials, case ID, document count badge).
5. **Documents in {activeCaseId}** section — only rendered when a case is
   selected: a list of that case's uploaded documents (filename, doc_type
   + chunk count), and a compact `UploadDropzone` beneath to add more.

### 6.4 Conversation & case state model (`lib/legalragHistory.ts`)

```ts
type ChatMessage =
  | { role: "user"; text: string; caseId: string | null }
  | { role: "assistant"; answer: QueryResponse }
  | { role: "error"; text: string }
  | { role: "pending" };
interface Conversation { id, title, messages: ChatMessage[], caseId, updatedAt }
```

- Persisted to `localStorage` key `veritas.legalrag.conversations.v1`,
  capped at **50 most-recently-updated conversations** on every save
  (`saveConversations` sorts + slices).
- `deriveTitle()`: first user message, whitespace-collapsed, truncated to
  56 chars with a trailing `…`.
- A conversation is only persisted **after the first user message is
  sent** (`persist()` early-returns if there's no user message yet) — so
  starting a new chat and not sending anything leaves no history trace.
- **Cases are a hybrid of server and client state**: `listCases()` hits
  `/api/cases`; any case the user created locally (`localCaseIds`, a
  plain `useState<string[]>`, not persisted) that the server doesn't yet
  know about is merged in as a synthetic `{case_id, documents: []}` entry
  — this is how a brand-new case appears in the sidebar immediately, even
  though the backend has no record of it until the first document is
  uploaded to it. **This local list is lost on page reload** — a known
  rough edge (see §13).

### 6.5 Sending a message (`send()` in `LegalRagPage.tsx`)

1. Append a `user` message + a `pending` placeholder, persist immediately
   (so an in-flight question survives a reload... except it doesn't,
   since nothing is awaited yet — the persist happens synchronously with
   the pending state in memory, written to localStorage on the next
   render's effect).
2. `POST /api/query` with `{query, case_id: activeCaseId}`.
3. On success: replace the pending message with an `assistant` message
   carrying the full `QueryResponse`; persist again.
4. On failure: replace pending with an `error` message showing
   `e.message`; persist again. Errors are never retried automatically.
5. Auto-scroll to bottom on every message list change.

Composer (`components/legalrag/Composer.tsx`): auto-growing textarea
(manual `style.height` recalculation, capped at 160px), Enter sends /
Shift+Enter newlines, 4000-char hard limit with a counter that appears
once past 90% (turns warning-amber at the limit), placeholder changes
based on whether a case is active, disclaimer text below ("Answers are
generated from indexed statutes and are not a substitute for legal
advice."), send button disabled while empty or while a request is
in-flight.

### 6.6 Document upload (`components/legalrag/UploadDropzone.tsx`)

Compact dropzone shown only inside the active case's sidebar section.
`POST /api/cases/{caseId}/upload` with the raw `File`. On success: fires
`onUploaded()` (parent refetches `/api/cases` + the specific case) and
pushes a success toast ("{doc_type} indexed", "{N} chunk(s) added to
{caseId} · {elapsed_s}s"). On failure: inline error text under the
dropzone **and** an error toast, both shown simultaneously (duplicated
feedback — worth collapsing to one if rebuilding). Toasts are a small
custom stack (`lib/toast.tsx`, bottom-right, 5s auto-dismiss, no external
library).

### 6.7 Rendering an answer (`AnswerCard.tsx` + children)

- Header row: confidence badge (tone-mapped, dotted), intent badge (brand
  tone, shown if non-empty), case-scope badge (info tone, shown if
  `case_id` present), elapsed time (`<1000ms` shown as `"Nms"`, else
  `"N.Ns"`) + a copy-to-clipboard icon button (far right, auto-aligned via
  `ml-auto`).
- **`AnswerText.tsx`**: the core citation-linking mechanism. The backend
  embeds inline bracket tokens in the answer prose, e.g. `"...liable under
  [IPC_420]."`. A regex (`/\[([A-Za-z0-9_./-]{2,40})\]/g`) finds every
  token; if it matches a `section_id` in the response's `citations` array
  (case-insensitive), it becomes an anchor link
  (`#citation-{messageId}-{sectionId}`) styled as a small monospace chip
  colored by that citation's validity tone; if it doesn't match anything
  known, it renders as plain faint monospace text (so an unresolved
  citation token is visually distinguishable from a real, clickable one).
- **Warnings banner** (amber box) — shown if `warnings.length > 0`;
  deduplicated via `Set` before rendering.
- **IRAC bars** (`IracBars.tsx`) — shown if `irac_summary` has any keys: a
  2×2 (or 4-wide on `sm+`) grid, one bar per IRAC dimension (label mapped
  from the raw key — `issue→Issue`, `rule→Rule`, `application→Application`,
  `conclusion→Conclusion`, falling back to the raw key for anything
  unrecognized), each a horizontal progress bar (value clamped 0–1, shown
  as a percentage-width amber fill) with the raw numeric value
  (2 decimals) alongside.
- **Citation cards grid** (`CitationList.tsx`, 2-column on `sm+`) — each
  card: section ID chip, validity badge, category badge (if present),
  italic serif act name, content text (clamped to 3 lines if over 220
  chars, with a "Show more/less" toggle), and — if present — an inline
  warning strip (amber, small triangle icon) for things like "this
  section was repealed." Each card has an `id` anchor matching the inline
  citation chip's href, so clicking a `[SECTION_ID]` token in the prose
  jumps straight to its card.

### 6.8 Pending/thinking state (`MessageRow.tsx`)

While `role === "pending"`, a rotating four-step "thinking" caption cycles
every 1.6s (`"Understanding your question" → "Searching Indian law for
relevant sections" → "Checking which sections actually apply" → "Writing
an answer with citations"`) next to a pulsing dot — this is purely
decorative/client-side timing, not tied to any real backend progress
signal (the backend gives no incremental status for `/api/query`, it's a
single blocking call).

### 6.9 Empty state (`EmptyState.tsx`)

Shown when `messages.length === 0`: brand icon in a glowing badge, serif
headline "Ask a question grounded in Indian statute law", a short
description, 4 clickable example questions (pre-written, click fills the
composer and sends immediately via `onPick`), and a 4-item feature list
(each a Lucide icon + one line, e.g. "Flags outdated or repealed
sections").

---

## 7. VideoRAG page (Kubrick) — full spec

### 7.1 Backend contract — `VideoRAG/backend` (FastAPI, port 8001)

```
GET    /health
  → { status: string, indexes: Record<string, unknown> }   # "healthy" = fully up

POST   /execute
  multipart: file (video), case_id?: string
  → { task_id, status, message, case_id }      # fire-and-forget; poll /status/{task_id}

GET    /status/{task_id}
  → { task_id, status: "processing"|"completed"|"failed", progress: 0–1,
      message: string, video_id: string|null, captions_ready: boolean }

GET    /videos
  → VideoInfo[]

DELETE /videos/{video_id}
  → { status, video_id, deleted: string[] }

POST   /chat
  json: { query, video_id: string|null, case_id: string|null }
  → ChatResponse

POST   /chat/image
  multipart: query, image (File), video_id?: string
  → ChatResponse

GET    /videos/{video_id}/speakers
  → { video_id, speakers: SpeakerRoleEntry[] }
POST   /videos/{video_id}/speakers
  json: { mappings: SpeakerRoleEntry[] }
  → { video_id, updated: SpeakerRoleEntry[] }

GET    /cases/{case_id}/speaker-matches
  → SpeakerMatchesPayload
POST   /cases/{case_id}/speaker-matches/confirm
  json: { video_id, local_speaker_id, action: "confirm"|"rename",
          corrected_name?, role? }
  → { case_id, result }

GET    /cases/{case_id}/testimony
  → { case_id, total_statements, statements: TestimonyStatement[] }
GET    /cases/{case_id}/contradictions
  → { case_id, total_contradictions, contradictions: CaseContradiction[] }

GET    /videos/{video_id}/play            → video file, supports HTTP range requests
GET    /frames/{video_id}/{frame_file}    → static frame image
```

Full type shapes:
```ts
interface VideoInfo {
  video_id, filename, duration: number|null, resolution: string|null,
  fps: number|null, frame_count: number|null,
  status: string,                 // "processing" | "completed" | "failed" | "missing"
  uploaded_at: string|null, thumbnail: string|null,
  captions_ready: boolean, case_id: string|null;
}
interface ChatResponse {
  answer: string;                 // hand-rolled-markdown formatted
  clips: VideoClip[];
  sources: SearchResult[];
  citations: CitationVerification[];
  contradictions: ContradictionResult[];
}
interface VideoClip { video_id, start_time, end_time, frame_paths: string[], description }
interface SearchResult {
  video_id, frame_number: number|null, timestamp: number|null,
  start_time: number|null, end_time: number|null, score: number,
  content: string, frame_path: string|null,
  source_index: "caption" | "image" | "speech" | "ocr" | string;
}
interface CitationVerification {
  citation_id, timestamp: number, timestamp_text: string,
  verification_score: number,
  verification_result: "verified" | "uncertain" | "unsupported" | "unverified";
  explanation: string, clip_hash: string;
}
interface ContradictionResult {
  contradiction_id, speaker_id, statement_a, statement_b, confidence: number,
  explanation, video_a: string|null, video_b: string|null,
  timestamp_a: number|null, timestamp_b: number|null;
}
interface SpeakerMatch {
  video_id, local_speaker_id, canonical_name, confidence: number,
  role: string, confirmed_by_user: boolean;
}
interface TestimonyStatement { id, session_id, video_id, speaker_id, role, timestamp, text, created_at }
interface CaseContradiction {
  id, case_id, speaker_id,
  stmt_a_id, stmt_a_text, stmt_a_timestamp, stmt_a_video_id,
  stmt_b_id, stmt_b_text, stmt_b_timestamp, stmt_b_video_id,
  confidence, explanation, detected_at;
}
```

**Backend internals worth knowing**: this is the most mechanically
involved of the three. Uploading a video triggers a background pipeline
(adaptive frame sampling → CLIP visual embeddings → async BLIP
captioning on a sparse subset of frames → OCR (EasyOCR) on a sampled
subset → YOLO object detection → Whisper transcription + pyannote
speaker diarization → voiceprint matching against known speakers in the
same `case_id` → testimony/contradiction indexing), all on a single GPU,
fully local, no cloud calls beyond none at all for inference (Groq is
used only for the chat agent's own reasoning/routing, per the standalone
README). Chat queries are answered by an LLM-driven agent ("Kubrick",
Llama-4-Scout via Groq) that tool-calls across four separate indexes
(image/visual-CLIP, caption/BLIP, speech/transcript, OCR) and runs a
citation-verification pass against the actual transcript/frame evidence
before returning. **Frame paths in API responses are backend-local
filesystem paths** — the frontend never trusts them directly; `frameUrl()`
strips everything but the last two path segments
(`{video_id}/{frame_file}`) and rebuilds a URL against the configured
backend base, because frontend and backend commonly run on different
machines with entirely different filesystem layouts.

### 7.2 Page structure (`pages/VideoRagPage.tsx`)

Three-column-capable layout: left sidebar (video library) + center chat
column + optional right panel (video player, shown only when a clip is
clicked). Two modals can overlay: Upload and Case Panel.

### 7.3 Left sidebar (`components/videorag/Sidebar.tsx`)

- Brand (film icon, "VideoRAG" / "Forensic Analysis").
- "Upload Evidence" button — gradient amber pill, opens the upload modal.
- "Search All Videos" row — selects `video_id = null` (global search
  scope); highlighted when active.
- "Evidence Library" header with a live count badge.
- One row per video: thumbnail (or a film-icon placeholder), filename
  (truncated, full name on `title` tooltip), duration (`m:ss`) +
  resolution, a clickable case-ID chip (if the video has one — opens the
  Case Panel directly from here) below the metadata row, and a
  `StatusBadge` (see below). A delete (X) button appears on row hover;
  clicking it shows a native `window.confirm`, then calls `DELETE
  /videos/{id}` and refreshes the list (also clears the chat scope if the
  deleted video was selected).
- Loading state: three bouncing dots. Empty state: film icon + "No videos
  uploaded yet" + a hint to use the upload button.

`StatusBadge.tsx`: 4 known states, each a pill with icon + label —
`processing` (spinning loader, amber), `completed` → labeled **"Ready"**
(check, green), `failed` (X, red), `missing` (question mark, red);
anything unrecognized falls back to the `processing` visual.

### 7.4 Upload flow (`components/videorag/UploadModal.tsx`)

Three explicit phases (`idle → uploading → processing`, plus a terminal
`error` state), each with distinct UI — this is the "two-phase progress"
the README calls out:

1. **Idle**: optional free-text Case ID input (helper text: "group videos
   from the same trial for contradiction detection"; leave empty for
   auto-generated), then either a dashed dropzone or — once a file is
   picked — a file-info row (video icon, name, size, remove button).
   Client-side validation before accepting a file: extension must be one
   of `.mp4 .avi .mov .mkv .webm .flv .wmv`, size must be ≤ **500MB**
   (both checked purely client-side before any network call;
   **note: the standalone VideoRAG README documents no server-side size
   limit at all** — the 500MB ceiling exists only in this frontend
   component).
2. **Uploading**: real byte-level progress via `XMLHttpRequest.upload.
   onprogress` (not `fetch`, specifically to get progress events) —
   percentage bar + label.
3. **Processing**: polls `GET /status/{task_id}` every 2 seconds.
   Progress bar reflects the backend's own `progress` float; the status
   message text updates live from the backend's `message` field (so the
   user sees literal backend-reported steps like "Extracting frames…",
   "Transcribing audio…"). Once `progress >= 1` but `captions_ready` is
   still false, shows an italic note that caption indexing continues in
   the background. On `status === "completed"`: closes out by checking
   `GET /cases/{caseId}/speaker-matches` — if there are pending matches,
   the parent page opens the Case Panel directly to the Speakers tab so
   the user can resolve them immediately after upload. On `status ===
   "failed"`: shows the backend's failure message, switches to the error
   phase with a Close button (no retry button — user must reopen the
   modal and re-upload).

### 7.5 Case Panel (`components/videorag/CasePanel.tsx`) — modal, 3 tabs

Opened either from a video row's case chip or automatically post-upload.
Fetches all three case-scoped endpoints in parallel on open
(`Promise.all`): speaker-matches, testimony, contradictions.

**Speakers tab**:
- **Pending Voiceprint Matches**: each unconfirmed match shows the
  system's guessed canonical name + role, the source video/local-speaker
  IDs, and a confidence percentage (or "newly registered" if confidence
  is 0, meaning no match was found and this is being proposed as a new
  identity). Two actions: **Confirm** (accepts the system's guess
  as-is) or **Correct…** (expands an inline form: name text input with a
  `<datalist>` of all known case speaker names for autocomplete, a role
  `<select>`, Save/Cancel) — confirming either way calls `POST .../
  speaker-matches/confirm` with `action: "confirm"` or `action: "rename"`
  and refreshes all three tabs' data.
- **Known Speakers in Case**: a flat pill list of every canonical name +
  role known to the case so far.
- **Edit Speaker Roles for a Video**: a video picker (`<select>` of every
  `video_id` appearing in that case's testimony), which on selection
  loads that video's `speakers` array and renders one row per speaker —
  role `<select>` (unknown/judge/witness/counsel) + free-text label
  input, all held in local state until "Save Roles" is clicked (a single
  batch `POST .../speakers` call with the full mutated array — no
  per-row save, no optimistic UI, no dirty-state tracking: clicking Save
  always re-sends everything).

**Testimony tab**: every statement for the case, sorted by timestamp
ascending, each row showing role-or-speaker-ID, the raw speaker ID
(monospace chip), a `[m:ss]` timestamp chip, the source video ID, and the
quoted statement text.

**Contradictions tab**: one card per detected contradiction — speaker
name, a confidence-tier badge (same `>=0.8/>=0.6` high/medium/low
bucketing as elsewhere), the two conflicting statements shown as a visual
"Session 1 ... VS ... Session 2" stack (each with its own timestamp +
source video, italic quoted text), and — if present — an explanation line
prefixed with a 💡 emoji.

### 7.6 Chat interface (main column)

**Header**: "Kubrick AI" + sparkle icon, subtitle either "Searching across
all evidence videos" or "Analyzing video `{video_id}`" depending on scope,
a "Scoped to video" pill when a specific video is selected, and a "Clear"
button (wipes local chat history only — no backend call) once any
messages exist.

**Empty state**: centered, floating sparkle icon animation, welcome copy,
and a 2×2 grid of **suggestion chips**: "What objects appear in the
video?", "When did someone speak about a weapon?", "Show me frames with a
person walking" (each fills the composer on click), and "Upload image to
identify a person or object" (opens the image-attach file picker
directly, distinct behavior from the other three).

**Composer**: auto-growing single-line-by-default textarea
(Enter = send, Shift+Enter = newline), a paperclip button to attach a
**reference image** for visual similarity search, drag-and-drop support
for images directly onto the chat column (shows a dashed "Drop image to
search visually" hint while dragging), and — once an image is attached —
a preview strip above the composer (thumbnail + filename + remove
button). Helper text below: "Press Enter to send · Shift+Enter for new
line · 📸 attach image for visual search · drag & drop supported".

**Sending**: if an image is attached, calls `POST /chat/image`
(multipart: query text + image + optional video_id scope — query
defaults to `"Find frames similar to this image"` if left blank); else
`POST /chat` (json: query, video_id, case_id). A `pending` placeholder
message (three bouncing dots next to the brand avatar) shows while
awaiting the response. **On error, the failure is rendered as if it were
a normal assistant answer** — `{answer: "⚠️ Error: {message}. Make sure
the backend is running.", clips: [], sources: [], citations: [],
contradictions: []}` — rather than a distinct error message type (unlike
Legal RAG, which has a dedicated `role: "error"` message kind). This is
an inconsistency worth normalizing if rebuilding.

**`MessageBubble.tsx` — assistant message rendering**, in order:
1. "Kubrick" label (small caps, amber).
2. The answer body, rendered via `renderMarkdown()` (see below) into
   `dangerouslySetInnerHTML` inside a `.msg-markdown` wrapper.
3. **Contradictions block** (if any) — same visual pattern as the Case
   Panel's contradictions tab, inlined directly in the chat bubble when
   the agent's answer surfaces a contradiction.
4. **Retrieved Frames** — up to 2 `ClipCard`s shown primarily (thumbnail,
   "Match N" badge, timestamp overlay, optional description caption,
   video ID + time-range footer; clicking opens the right-side video
   player panel), with any additional clips collapsed behind a "▼ Show N
   More Results" toggle that expands to a compact horizontal list.
5. **Citation Verification** — collapsed by default behind a toggle
   showing "{verified}/{total} verified"; expanded view is a list of
   cards, each showing a verification-result badge (✅ Verified / ⚠️
   Uncertain / ❌ Unsupported / ❓ Unverified, each its own color), the
   claimed timestamp, a confidence percentage, an explanation line, and a
   truncated `clip_hash` (shown with a lock icon, full hash on hover
   title) — this is a tamper-evidence/forensic-integrity signal, not just
   a relevance score.
6. **Sources footer** — small pills, one per *distinct* `source_index`
   value actually present across all sources (not one per source), each
   labeled with an emoji + name: 👁️ Caption Index / 🖼️ Visual Index /
   🎤 Speech Index / 📄 OCR Index.

**`lib/videoragMarkdown.ts` — `renderMarkdown()`**: a small hand-rolled
markdown subset (ported from an earlier standalone VideoRAG frontend),
line-by-line: `### ` → `<h4 class="msg__heading">`, `- `/`• `/`1. ` →
`<ul><li>` (consecutive bullet lines grouped into one list), `**bold**` →
`<strong>`, `` `code` `` → `<code>`, and a regex that turns `[m:ss]` or
`[m:ss - m:ss]` tokens anywhere in text into `<span class="msg__
timestamp">` pills — **no clickability**, purely visual (unlike Legal
RAG's citation tokens, these timestamp pills don't jump anywhere or seek
the video). Everything else becomes a plain `<p>`. HTML-escapes input
first to prevent injection from model output before re-inserting markup.

### 7.7 Video Player Panel (`components/videorag/VideoPlayerPanel.tsx`)

A 420px right-side panel, appears only when a clip is clicked. An HTML5
`<video>` element with native controls, `autoPlay`, sourced via
`videoPlayUrl(base, videoId, {start, end})` — which appends a `#t=start,
end` media fragment to the `/videos/{id}/play` URL, so the browser's
native video engine seeks to the clip's start time automatically on load
(no custom seek logic needed). Below the player: a metadata list (video
ID, time range, description), and — if the clip has multiple
`frame_paths` — a horizontal filmstrip of thumbnails; clicking one
manually seeks (`videoRef.current.currentTime = ts`) and plays, where the
timestamp is parsed out of the frame filename itself via a regex
(`/frame_(\d+)/`), falling back to the clip's start time if no match.

---

## 8. Shared infrastructure reference

### 8.1 `lib/http.ts` — the one fetch wrapper everything uses

```ts
export class ApiError extends Error { status: number }

async function request<T>(base, path, init?): Promise<T>
```

- Network-level failure (DNS, connection refused, CORS block) is caught
  and rethrown as a **single generic message**: `"Can't reach {base}.
  Check the URL in Settings and confirm the backend is running and
  reachable on the network."` with `status: 0` — the user cannot
  distinguish "wrong URL," "CORS misconfigured," and "backend crashed"
  from this message alone.
- Non-2xx responses: tries to parse the JSON body for a `detail` or
  `error` string field (FastAPI's and Flask's conventional error shapes
  respectively); falls back to `res.statusText` or a raw `HTTP {status}`
  string if the body isn't JSON or doesn't have either field.
- `204 No Content` responses resolve to `undefined` rather than
  attempting to parse an empty body as JSON.
- `jsonInit(body)` is a small helper that returns a ready-to-spread
  `RequestInit` for POST+JSON (method, `Content-Type` header,
  `JSON.stringify`).

### 8.2 `lib/format.ts`

`formatBytes` (B/KB/MB/GB, 1 decimal except whole bytes), `formatDuration`
(`m:ss`, returns `"—"` for null/NaN), `formatPercent` (rounds to whole
%), `formatRelativeTime` (ISO string → "just now" / "Nm ago" / "Nh ago" /
"Nd ago", no week/month/year granularity beyond that).

### 8.3 `localStorage` key inventory (everything Veritas persists)

| Key | Holds | Written by |
|---|---|---|
| `veritas.settings.v1` | the 3 backend base URLs | `lib/settings.tsx` |
| `veritas.legalrag.conversations.v1` | Legal RAG chat history (≤50) | `lib/legalragHistory.ts` |
| `veritas.cernpix.theme` | CernPix page's own light/dark pref | `lib/usePageTheme.ts` |
| `veritas.legalrag.theme` | Legal RAG page's own light/dark pref | `lib/usePageTheme.ts` |

Notably **not persisted anywhere**: staged Upload files, VideoRAG chat
history, which video/case is currently selected in VideoRAG, locally-
created-but-not-yet-uploaded-to Legal RAG case IDs, which sidebar tab is
active. All of this resets to defaults on every full page reload.

---

## 9. Cross-cutting conventions to preserve if rebuilding

1. **Three genuinely different visual languages, one shell.** This is the
   core design idea and should not be "unified" into one design system —
   the whole point is that each tool page is a faithful port of its own
   standalone product's look, not a reskin. The shell (sidebar, Upload
   page, Settings) is deliberately the *fourth*, neutral identity that
   ties them together without competing with any of them.
2. **Runtime-configurable backend URLs, not build-time env vars.** This
   is load-bearing for the actual deployment model (frontend and backends
   on different LAN machines) — don't replace Settings with `.env` files.
3. **Health dots must reflect real reachability, not just "did the
   component mount."** Each backend's health semantics differ slightly
   (CernPix: `ok` boolean; Legal RAG: three-state `loading/ready/error`;
   VideoRAG: free-form `status` string) and the polling/backoff behavior
   (fixed 20s for the sidebar, adaptive 2s→20s for Legal RAG's own
   `HealthPill`) is intentional, not an oversight to normalize away.
4. **Every destructive action that matters gets a native `confirm()`** —
   currently only video deletion does this; file removal from Upload/
   Deepfake and conversation deletion in Legal RAG do not, which is
   inconsistent and worth deciding deliberately either way.
5. **Citations/clips/sources are forensic artifacts, not decoration** —
   in both Legal RAG (citation cards with validity/warning) and VideoRAG
   (citation verification with a cryptographic-looking `clip_hash`,
   confidence-tiered contradiction evidence), the UI treats "where did
   this claim come from" as first-class, always-visible-on-demand
   information, not something to collapse away to reduce clutter.

---

## 10. Known gaps worth a deliberate decision before/while rebuilding

(Not bugs exactly — things that work today but represent either
unfinished intent or inconsistency across the three tool pages.)

- **Upload page doesn't actually feed staged files into the three tools.**
  Either wire it up for real or stop implying it does (see §3.4).
- **No routing** — no deep links, no back-button support, no "restore
  last tab" on reload. Four tabs and zero URLs.
- **VideoRAG chat errors render as fake assistant answers; Legal RAG has
  a real `error` message type.** Pick one pattern.
- **Locally-created Legal RAG case IDs vanish on reload** until a
  document is actually uploaded to them (`localCaseIds` is plain
  `useState`, not persisted).
- **`CONF_TIER` (confidence bucketing) is defined independently in two
  different VideoRAG files** with the same thresholds — extract once.
- **The 500MB video size cap is frontend-only**, invented by this
  component, not documented or enforced by the actual VideoRAG backend.
- **`UploadDropzone` (Legal RAG) shows both an inline error and a toast**
  for the same failure — redundant.
- Legal RAG's `HealthPill` maps backend `status: "error"` to a *danger*
  visual tone but the sidebar's own `legalragState` health check maps the
  same `"error"` status to `"degraded"` (amber) — two different severity
  readings of the identical backend signal, in two different components.

---

## 11. If you are an AI building a new UI from this spec

You have everything needed to either (a) reproduce Veritas's current
behavior exactly, or (b) use it as a known-good baseline and deliberately
improve specific things called out in §10. A few orientation notes:

- The three backends are **real, running, independently-owned systems**
  with their own release cadence — don't assume you can change their API
  shapes; treat §5.1/§6.1/§7.1 as fixed contracts to build against, not
  suggestions.
- If asked to redesign visually, the one constraint that must survive is
  **per-tool visual independence** — whatever you do to CernPix's page
  should not visually bleed into VideoRAG's page or the shell, and vice
  versa. A single global dark-mode toggle for the whole app would be a
  regression from current behavior, not an improvement (each tool's dark
  mode is independently stateful today, and VideoRAG has no light mode at
  all by design).
- If asked to add real cross-tool file handoff (closing the Upload page
  gap in §3.4/§10), the natural integration point is each tool's own
  upload component reading from `useFileStore()` as an additional source
  next to its own dropzone/file-input, not replacing them.
