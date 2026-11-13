# Veritas

Unified frontend for three independent backends:

| Tool | Backend | Framework | Default port |
|---|---|---|---|
| Deepfake Detection | `cernpix-backend/` | Flask | `8010` |
| Legal RAG | `legal-rag-system/backend/` | FastAPI | `8000` |
| VideoRAG | `VideoRAG/backend/` | FastAPI | `8001` |

This app is only the frontend. It does not contain any model code — it calls
the three backends over HTTP from the browser. Each backend's URL is set
independently in **Settings**, so any mix is fine: all three remote, all
three local, or (a common split) Deepfake Detection + VideoRAG on one
machine and Legal RAG running alongside the frontend on another — see
"Pointing it at the backends" below.

## Design

- Sidebar: **Upload**, **Deepfake Detection**, **Legal RAG**, **VideoRAG**, plus **Settings**. This outer shell is Veritas's own — the point of the app is one frontend for three backends.
- Each of the three tool pages is a faithful port of its standalone app's own UI and workflow, not a generic reskin:
  - **Deepfake Detection** reproduces CernPix — the Add Images / All Files / Flagged gallery, folder uploads, and hover-to-reveal flagged detail card, in CernPix's neutral + blue theme.
  - **Legal RAG** reproduces Nyaya — the case/history sidebar, IRAC coverage bars, inline `[SECTION_ID]` citation chips that jump to full citation cards, and warnings banner, in the same neutral + blue theme as Deepfake Detection and Upload.
  - **VideoRAG** reproduces Kubrick — the evidence library with case badges, the upload flow's two-phase progress (upload → processing), the case panel's Speakers/Testimony/Contradictions tabs, and the clip-triggered video player panel. It shares Legal RAG's home screen layout and composer, and both use the same neutral + blue theme as Deepfake Detection and Upload.
- **Upload** is a shared staging area — drop a file once and it's available to pick from in whichever tool needs it (images → Deepfake Detection, videos → VideoRAG, PDFs/scans → Legal RAG case documents). Each tool also has its own dropzone for convenience.
- One light/dark toggle (bottom of the sidebar, next to Settings) switches the whole app. Saved in the browser; defaults to the OS preference.
- Live green/amber/red connection dots per backend in the sidebar.
- Backend URLs are runtime-configurable from the **Settings** modal (saved to the browser's `localStorage`, no rebuild needed) — this is how you point the copied frontend at this machine's LAN IP.

## Run it

```bash
npm install
npm run dev -- --host       # exposes on the LAN, e.g. http://<this-machine-ip>:5174
```

Or build static files and serve them:

```bash
npm run build
npm run preview -- --host
```

Node.js (18+) must be installed on whichever machine runs the frontend.

### Pointing it at the backends

Open **Settings** (bottom of the sidebar) and set each backend's address —
`http://localhost:<port>` if that backend runs on the same machine as the
frontend, or `http://<backend-machine-ip>:<port>` if it runs elsewhere on
the LAN.

**Current split:** Deepfake Detection and VideoRAG run on the backend
machine (`172.17.149.233` at time of writing — confirm with `hostname -I`
on that machine, since this can change); Legal RAG runs locally, alongside
the frontend.

- Deepfake Detection → `http://172.17.149.233:8010`
- VideoRAG → `http://172.17.149.233:8001`
- Legal RAG → `http://localhost:8000`

## Backend changes

Already applied and verified live (VideoRAG restarted, confirmed reachable
and CORS-clean from a real browser pointed at this frontend). Full diffs
and line numbers are in **[`BACKEND_CHANGES.md`](./BACKEND_CHANGES.md)**.
Short version:

- **VideoRAG** (`backend/config.py`, `backend/main.py`): CORS was hardcoded
  to two `localhost:5173` origins → now reads `CORS_ORIGINS` (default `*`).
  Default port moved `8000` → `8001` to stop clashing with Legal RAG, and
  the `__main__` entry point now actually honors it.
- **Legal RAG** (`backend/app/config.py`, `backend/app/main.py`):
  `CORS_ORIGINS` default was `localhost:3000` only → now `*`. Added a
  `__main__` block so `python -m app.main` binds `0.0.0.0` (its `HOST`/
  `PORT` config existed but nothing previously called `uvicorn.run` with it).
- **CernPix**: no change — already `0.0.0.0` + open CORS.

### How to run (on the backend machine)

```bash
# Deepfake Detection
cd cernpix-backend && python app.py
# → 0.0.0.0:8010

# VideoRAG
cd VideoRAG && ./.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001
# → 0.0.0.0:8001

# Legal RAG — needs its corpus indexed first if you haven't already
# (see legal-rag-system/rag/README.md "Setup"), then:
cd legal-rag-system/backend && python -m app.main
# → 0.0.0.0:8000
```

Make sure the backend machine's firewall allows inbound connections on
`8010`, `8000`, and `8001` from the frontend machine.
