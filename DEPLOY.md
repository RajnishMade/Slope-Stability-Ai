# Deployment guide

Free public deployment: **backend on Hugging Face Spaces**, **frontend on Vercel**.
Both deploy from this single GitHub repo. Neither needs a credit card.

> **Deploy the backend first.** The frontend needs the backend's public URL, which
> only exists after the Space is live.

---

## Part 1 — Backend → Hugging Face Spaces (Docker)

The repo is already set up as a Docker Space: `Dockerfile`, `.dockerignore`, and
the Space config (the `---` block at the top of `README.md`) are all in place.

1. Create a free account at <https://huggingface.co>.
2. **New → Space.**
   - **Owner:** your username
   - **Space name:** `slope-stability-ai` (or anything)
   - **SDK:** **Docker** → *Blank / from scratch*
   - **Hardware:** **CPU basic — free** (2 vCPU, 16 GB RAM)
   - **Visibility:** Public
3. Push this repo to the Space. In the project folder:

   ```bash
   git remote add space https://huggingface.co/spaces/<your-username>/slope-stability-ai
   git push space main
   ```

   (HF will ask for your username and an **access token** as the password —
   create one at *Settings → Access Tokens*, role **write**.)
4. Open the Space. First build takes several minutes (installing torch etc.).
   When it says **Running**, the API is live at:

   ```
   https://<your-username>-slope-stability-ai.hf.space
   ```

   Test it: `https://<your-username>-slope-stability-ai.hf.space/health` should
   return `{"status":"ok"}`, and `/docs` shows the interactive API.

> **First request after idle is slow (~1 min).** Free Spaces sleep after a period
> of inactivity, and on wake all four TabPFN models re-fit before the first
> prediction returns. This is expected.

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
   | `VITE_API_BASE` | `https://<your-username>-slope-stability-ai.hf.space` |

   (No trailing slash. This is baked in at build time, so it must be set before
   the first build.)
5. **Deploy.** Your public site will be at `https://<project>.vercel.app`.

`frontend/vercel.json` already routes every path to `index.html`, so deep links
like `/analysis/planar` and page refreshes work with React Router.

---

## Part 3 — (Optional) lock down CORS

The API defaults to `allow_origins=["*"]` — fine for a public read-only demo.
To restrict it to your Vercel site, add an env var **on the Hugging Face Space**
(*Settings → Variables and secrets*):

```
ALLOWED_ORIGINS = https://<project>.vercel.app
```

The Space restarts and only accepts requests from that origin.

---

## Redeploying after changes

- **Frontend or backend code:** `git push origin main`, then `git push space main`.
  Vercel redeploys automatically on push to GitHub; the Space rebuilds on push to
  the `space` remote.
- **After changing datasets or the model:** re-run `python3 scripts/evaluate_models.py`
  to refresh `backend/model_metrics.json`, commit it, then push to the Space.

---

## Notes and limits

- **Cold starts** on both free tiers: the first visit after idle is slow. Fine for
  a portfolio/demo, not for steady production traffic.
- **One backend worker** by design — concurrent requests to a single TabPFN model
  deadlock it, so predictions are sequential (~2.4 s each).
- **Source photos** (the large images in the project root) are gitignored and not
  deployed; the app uses the optimised copies in `frontend/public/backgrounds/`.
