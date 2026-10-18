"""
Vercel entrypoint for the Slope Stability AI API.

Vercel's zero-config FastAPI support looks for a FastAPI instance named `app`
in a root-level app.py; this re-exports the real one from backend/main.py.
For local development run `python3 -m uvicorn backend.main:app --reload`.
"""
from backend.main import app  # noqa: F401
