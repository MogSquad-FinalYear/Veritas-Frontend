# Backend changes for Veritas (LAN frontend/backend split)

Two passes so far. The first (below, items 1-4) touched four files across
two of the three backend repos for the LAN frontend/backend split; nothing
in `cernpix-backend/` needed a change at that point. The second pass
(item 5) rebuilt each Veritas tool page to match its standalone app's own
UI and workflow, which needed one small additive endpoint in
`cernpix-backend/` — see below.

---

## 1. `VideoRAG/backend/config.py`

**Why:** `BACKEND_PORT` defaulted to `8000`, the same default as
`legal-rag-system/backend`; running both on one machine meant one would
fail to bind. There was also no CORS setting at all in this file — it was
hardcoded in `main.py` instead (see file 2).

**Change:** default `BACKEND_PORT` moved to `8001`, and a new `CORS_ORIGINS`
setting was added (comma-separated list from the `CORS_ORIGINS` env var,
defaulting to `*`).

```diff
@@ -65 +65,3 @@ ENABLE_LLM_POLISH = os.getenv("ENABLE_LLM_POLISH", "false")...
-BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
+# 8001 by default — legal-rag-system/backend also defaults to 8000, and both
+# backends are meant to run side by side on the same machine for Veritas.
+BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8001"))
@@ -67,0 +70,8 @@ FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "5173"))
+# CORS — comma-separated list of allowed origins, or "*" for any origin.
+# Defaults to "*" because the Veritas frontend is meant to run on a
+# different machine than this backend, over the LAN, at an origin that
+# isn't known in advance (see Veritas/README.md).
+CORS_ORIGINS = [
+    o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
+]
```

Line 65: `BACKEND_PORT` default `"8000"` → `"8001"` (two comment lines added above it).
Lines 70–77 (new): `CORS_ORIGINS` definition added after `FRONTEND_PORT`.

## 2. `VideoRAG/backend/main.py`

**Why:** CORS was a hardcoded two-entry allowlist (`localhost:5173` /
`127.0.0.1:5173` — the old standalone VideoRAG frontend's dev server only).
Any other origin, including Veritas running on another machine, was
silently rejected by the browser. Separately, the `__main__` block hardcoded
port `8000`, ignoring `config.BACKEND_PORT` entirely.

**Change:** import and use the new `CORS_ORIGINS` / `BACKEND_PORT` from
`config.py` instead of the hardcoded values.

```diff
@@ -9 +9 @@ from fastapi.staticfiles import StaticFiles
-from backend.config import FRAMES_DIR, DATA_DIR
+from backend.config import FRAMES_DIR, DATA_DIR, CORS_ORIGINS, BACKEND_PORT
@@ -25 +25 @@ app = FastAPI(
-# CORS — allow frontend
+# CORS — allow the frontend's origin (see backend/config.py:CORS_ORIGINS)
@@ -28 +28 @@ app.add_middleware(
-    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
+    allow_origins=CORS_ORIGINS,
@@ -84 +84 @@ if __name__ == "__main__":
-    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
+    uvicorn.run("backend.main:app", host="0.0.0.0", port=BACKEND_PORT, reload=True)
```

Line 9: import line extended with `CORS_ORIGINS, BACKEND_PORT`.
Line 28: `allow_origins=[...]` → `allow_origins=CORS_ORIGINS`.
Line 84: `port=8000` → `port=BACKEND_PORT`.

## 3. `legal-rag-system/backend/app/config.py`

**Why:** `CORS_ORIGINS` defaulted to `http://localhost:3000,http://127.0.0.1:3000`
only (the project's own Next.js dev server). Veritas, running on a
different machine/port, was rejected by the browser.

**Change:** default changed to `*` (still overridable via the `CORS_ORIGINS`
env var in `backend/.env` if you'd rather lock it to specific origins).

```diff
@@ -29,3 +32 @@ CORS_ORIGINS = [
-    o.strip() for o in os.getenv(
-        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
-    ).split(",") if o.strip()
+    o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
```

Lines 29–31 collapsed to one line; only the default-value string literal
actually changed.

## 4. `legal-rag-system/backend/app/main.py`

**Why:** this file had no `if __name__ == "__main__":` block at all. The
docstring recommends `uvicorn app.main:app --reload --port 8000`, which —
with no `--host` flag — binds to uvicorn's own loopback default
(`127.0.0.1`), unreachable from another machine on the LAN, and the
`HOST`/`PORT` values already defined in `config.py` were never actually
read by anything.

**Change:** added a `__main__` block so `python -m app.main` (run from
`backend/`) binds using `HOST`/`PORT` from `config.py` (`0.0.0.0` / `8000`
by default, both env-overridable) without needing to remember a `--host`
flag.

```diff
@@ -15 +15 @@ from fastapi.middleware.cors import CORSMiddleware
-from app.config import CORS_ORIGINS
+from app.config import CORS_ORIGINS, HOST, PORT
@@ -46,0 +47,9 @@ def root():
+
+
+if __name__ == "__main__":
+    import uvicorn
+    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
```

Line 15: import line extended with `HOST, PORT`.
Lines 47–55 (new): `__main__` block appended at end of file.

## 5. `cernpix-backend/app.py`

**Why:** the Deepfake Detection page was rebuilt to match CernPix's own
gallery UI (browse all past detections, grouped by folder, with real
thumbnails and a "Flagged" view) instead of only showing results from the
current browser session. That requires the backend to actually serve the
image bytes it saves — previously `/api/detect` and `/api/detections` only
ever returned metadata (filename, folder, score, ...), never the file
itself, so there was no way to render a thumbnail for anything uploaded in
an earlier session.

**Change:** added a read-only static route that serves files out of the
existing `UPLOAD_DIR` the backend already writes to.

```diff
@@ -3,9 +3,8 @@ import sys
 import time
 
 import torch
-from flask import Flask, jsonify, request
+from flask import Flask, jsonify, request, send_from_directory
 from flask_cors import CORS
@@ -122,6 +122,14 @@ def detections():
     return jsonify({"detections": db.list_detections(folder)})
 
 
+@app.route("/uploads/<path:filepath>", methods=["GET"])
+def uploaded_file(filepath):
+    return send_from_directory(UPLOAD_DIR, filepath)
+
+
 if __name__ == "__main__":
```

No new dependency, no change to `/api/detect` or `/api/detections`
response shapes — purely additive. `Veritas/src/lib/api/cernpix.ts` builds
these URLs via the new `uploadedFileUrl(base, filename, folder)` helper.

**Note:** this backend does not autoreload (`debug=False`), so the running
process must be restarted for this route to take effect if it was already
up when this change landed.

---

## Verified live

- `VideoRAG` backend was restarted with the fix
  (`.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001`),
  confirmed listening on `0.0.0.0:8001`, and confirmed serving
  `Access-Control-Allow-Origin: *` on `/health` for an `Origin: http://localhost:5174`
  request.
- Opened Veritas in a real browser: sidebar shows **VideoRAG: Online**, and
  the video library loads two previously-processed videos (with thumbnails)
  straight from the backend — full round trip through the fixed CORS/port
  config.
- `cernpix-backend` was already running on `0.0.0.0:8010` and needed no
  change; Deepfake Detection was already confirmed working in the previous
  pass (see chat history — real `ai.png` upload → real inference result).
- `legal-rag-system/backend` was **not** started — its corpus isn't indexed
  yet (`rag/qdrant_db` and `rag/data/*.json` don't exist), which is a
  pre-existing data-prep step unrelated to this frontend/CORS work. Its own
  `bootstrap_rag()` fails fast with the exact commands needed
  (`rag/README.md` → "Setup"). The CORS/host fix above is in place and will
  take effect once that backend is started.

---

## How to run everything

On **this machine** (the backends):

```bash
# 1. Deepfake Detection — already running, no change needed
cd cernpix-backend && python app.py
# → 0.0.0.0:8010

# 2. VideoRAG — now fixed; either form works and binds 0.0.0.0 by default
cd VideoRAG && ./.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001
# → 0.0.0.0:8001  (or: ./.venv/bin/python -m backend.main)

# 3. Legal RAG — first-time data prep (see rag/README.md), then:
cd legal-rag-system/backend && python -m app.main
# → 0.0.0.0:8000 (binds correctly now; add CORS_ORIGINS to backend/.env
#    if you want to lock it down instead of the new "*" default)
```

Confirm your firewall allows inbound `8010`, `8000`, `8001` from the
frontend machine.

On **the other machine** (the frontend, after copying the `Veritas/`
folder over):

```bash
cd Veritas
npm install
npm run dev -- --host
```

Open the printed `Network:` URL, go to **Settings** in the sidebar, and set
each backend field to `http://<this-machine's-LAN-IP>:<port>` (`8010` /
`8000` / `8001`). The sidebar's connection dots turn green as soon as each
one is reachable.
