# Deployment guide

Free public deployment, **entirely on Vercel**: the React frontend and the
FastAPI backend run as two Vercel projects built from this one GitHub repo.
Both redeploy automatically on every push to `main`.

| Project | Root Directory | What it serves |
| --- | --- | --- |
| Frontend | `frontend` | The website (Vite build, static) |
| Backend | repo root (`./`) | The prediction API (FastAPI as a Vercel Function) |

> **Deploy the backend first.** The frontend needs the backend's public URL,
> which only exists after the backend is live.

---

## Part 1 — Backend → Vercel Function

The backend runs on Vercel's free Hobby plan because the model work happens on
TabPFN's **hosted** API (`tabpfn-client`): the function only loads the data and
forwards requests. It fits the Hobby limits — 2 GB memory, ≤ 300 s per request,
500 MB Python bundle (this app's is ~450 MB). Local TabPFN (PyTorch) does not
fit on Vercel, so a `TABPFN_TOKEN` is required.

The repo is ready: `app.py` (repo root) exposes the FastAPI app, `requirements.txt`
lists the dependencies, and the root `vercel.json` caps request time at 60 s and
keeps the frontend, scripts and figures out of the function bundle.

1. Create a free account at <https://vercel.com> and connect your GitHub.
2. **Add New → Project** → import `Slope-Stability-Ai`. Name it e.g. `slope-stability-api`.
3. Configure:
   - **Root Directory:** leave as the repo root (`./`)
   - **Framework Preset:** FastAPI (auto-detected from `app.py`; select it if not)
4. **Environment Variables:**

   | Name | Value |
   | --- | --- |
   | `TABPFN_TOKEN` | your Prior Labs key (free at <https://ux.priorlabs.ai/account>) |

5. **Deploy.** Test it:
   - `https://<api-project>.vercel.app/health` → `{"status":"ok"}`
   - `https://<api-project>.vercel.app/docs` → interactive API

---

## Part 2 — Frontend → Vercel

1. **Add New → Project** → import `Slope-Stability-Ai` again (a second project).
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command / Output:** defaults (`npm run build` → `dist`)
3. **Environment Variables:**

   | Name | Value |
   | --- | --- |
   | `VITE_API_BASE` | `https://<api-project>.vercel.app` |

   No trailing slash. It is baked in at build time, so after changing it you
   must **Redeploy** (Deployments → ⋯ → Redeploy).
4. **Deploy.** The site is at `https://<project>.vercel.app`.

`frontend/vercel.json` routes every path to `index.html`, so deep links like
`/analysis/planar` and page refreshes work with React Router.

---

## Part 3 — (Optional) lock down CORS

The API defaults to `allow_origins=["*"]` — fine for a public read-only demo.
To accept requests only from your site, add to the **backend** project's
environment variables, then redeploy it:

```
ALLOWED_ORIGINS = https://<project>.vercel.app
```

---

## Redeploying after changes

- **Any code change:** `git push origin main` — both Vercel projects rebuild.
- **After changing datasets or the model:** re-run `python3 scripts/evaluate_models.py`
  to refresh `backend/model_metrics.json`, commit it, and push.

---

## Notes and limits

- **Cold starts.** After a few idle minutes the next API request starts a fresh
  instance (several seconds). Each instance fits a mode's model on its first
  request for that mode, then reuses it while warm. `backend/main.py` detects the
  `VERCEL` env var and skips the local background warm-up, which would otherwise
  cost four TabPFN API calls per new instance.
- **TabPFN quota.** Prior Labs' hosted API has its own free daily usage limit.
- **Hobby plan** is for non-commercial use.
- **Source photos** (the large images in the project root) are gitignored; the
  site uses the optimised copies in `frontend/public/backgrounds/`.
