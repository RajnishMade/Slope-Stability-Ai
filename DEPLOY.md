# Deployment guide

Free/low-cost public deployment: **backend on Railway**, **frontend on Vercel**.
Both deploy from this single GitHub repo. Neither needs a credit card.

> **Deploy the backend first.** The frontend needs the backend's public URL, which
> only exists after the backend is live.

---

## Part 1 — Backend → Railway (Docker)

> Hugging Face Docker/Gradio Spaces now require a paid PRO plan (only Static
> Spaces are free), so the backend goes to Railway instead. Railway gives a
> one-time trial credit (no card to start), then ~$5/month. It provides enough
> RAM (1–2 GB) to run the real TabPFN models, which the 512 MB free tiers can't.
> The repo is Railway-ready: `Dockerfile`, `.dockerignore` and `railway.json`
> are in place, and the container binds Railway's injected `$PORT`.

1. Sign up at <https://railway.com> with your GitHub account.
2. **New Project → Deploy from GitHub repo** → select `Slope-Stability-Ai`.
3. Railway detects the `Dockerfile` + `railway.json` and builds automatically.
   The first build takes several minutes (installing torch). Leave the service
   root at the repo root — `.dockerignore` keeps the frontend out of the image.
4. When the deploy is live, open the service → **Settings → Networking →
   Generate Domain**. That gives a public URL like:

   ```
   https://<something>.up.railway.app
   ```

5. Test it: `https://<something>.up.railway.app/health` should return
   `{"status":"ok"}` right away, and `/docs` shows the interactive API. The
   models warm in the background, so the *first* prediction of each mode takes
   ~10 s while that mode fits; after that it's ~2.4 s.

> **If Railway can't run it** (build fails, container is killed for memory, or
> the trial credit runs out and you don't want to pay), switch the backend to
> TabPFN's free hosted inference API — that removes PyTorch and fits any free
> host. Ask and this can be wired up.

---

## Part 2 — Frontend → Vercel

1. Create a free account at <https://vercel.com> and connect your GitHub.
2. **Add New → Project** → import this repository.
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command / Output:** defaults (`npm run build` → `dist`)
4. **Environment Variables** — add:

   | Name | Value |
   | --- | --- |
   | `VITE_API_BASE` | `https://<something>.up.railway.app` |

   (No trailing slash. This is baked in at build time, so it must be set before
   the first build.)
5. **Deploy.** Your public site will be at `https://<project>.vercel.app`.

`frontend/vercel.json` already routes every path to `index.html`, so deep links
like `/analysis/planar` and page refreshes work with React Router.

---

## Part 3 — (Optional) lock down CORS

The API defaults to `allow_origins=["*"]` — fine for a public read-only demo.
To restrict it to your Vercel site, add an env var **on the Railway service**
(*Variables* tab):

```
ALLOWED_ORIGINS = https://<project>.vercel.app
```

Railway restarts the service and only accepts requests from that origin.

---

## Redeploying after changes

- **Any code change:** `git push origin main`. Both Railway and Vercel watch the
  GitHub repo and redeploy automatically.
- **After changing datasets or the model:** re-run `python3 scripts/evaluate_models.py`
  to refresh `backend/model_metrics.json`, commit it, and push.

---

## Notes and limits

- **Cold starts** on both free tiers: the first visit after idle is slow. Fine for
  a portfolio/demo, not for steady production traffic.
- **One backend worker** by design — concurrent requests to a single TabPFN model
  deadlock it, so predictions are sequential (~2.4 s each).
- **Source photos** (the large images in the project root) are gitignored and not
  deployed; the app uses the optimised copies in `frontend/public/backgrounds/`.
