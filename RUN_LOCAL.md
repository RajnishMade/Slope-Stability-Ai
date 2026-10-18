# Run Slope Stability AI locally (VS Code)

Two servers run side by side:

- **Backend** — FastAPI + TabPFN, serves predictions at `http://localhost:8000`
- **Frontend** — React + Vite, the website at `http://localhost:5173`

The frontend automatically calls the backend at `localhost:8000`, so no config/env file is needed for local use.

> **TabPFN note:** without a `TABPFN_TOKEN` the backend always uses the **local `tabpfn`** package — no API token needed, even if `tabpfn-client` is also installed. The hosted client is used only when `TABPFN_TOKEN` is set (that's how the cloud deployment runs). On startup the backend prints which one it picked: `Using local TabPFN inference … no token required`.

---

## 1. Open in VS Code

`File → Open Folder…` → select the `Slope Stability Project copy` folder.
Open a terminal (`Ctrl+` `` ` ``) and split it into two (backend + frontend).

## 2. First-time setup (once)

Frontend dependencies:

```bash
cd frontend && npm install
```

Backend dependencies (local, no token):

```bash
pip3 install fastapi "uvicorn[standard]" pydantic pandas numpy scikit-learn tabpfn
```

## 3. Run (two terminals, from the project root)

**Terminal 1 — backend:**

```bash
python3 -m uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
cd frontend && npm run dev
```

## 4. Open the site

Vite prints `Local: http://localhost:5173/` — open it in your browser.

- **Analyse** (home): pick a failure mechanism → set parameters → **Run prediction**.
- **Validation**, **DGMS Guidelines** and **About** are in the top navigation bar.

---

## Notes & troubleshooting

- **First prediction per mode is slow (a few seconds).** TabPFN fits the model on first use, then caches it — later predictions are instant. The backend also warms all four models in the background at startup.
- **`Address already in use` on port 8000 or 5173:** a server is already running. Either use it, or free the port:
  ```bash
  lsof -ti tcp:8000 | xargs kill -9
  ```
  (swap `8000` for `5173` for the frontend port).
- **Backend health check:** open `http://localhost:8000/health` — it should return `{"status":"ok"}`. API docs: `http://localhost:8000/docs`.
- **Predictions hang or ask you to log in:** the local `tabpfn` package is missing, so the backend fell back to the hosted client. Run `pip3 install tabpfn` (or set a `TABPFN_TOKEN` — free key at https://ux.priorlabs.ai/account) and restart the backend.
- **Stop a server:** click its terminal and press `Ctrl+C`.
