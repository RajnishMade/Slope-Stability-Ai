# syntax=docker/dockerfile:1
#
# Backend image for Hugging Face Spaces (Docker SDK).
# Serves the FastAPI + TabPFN API on port 7860 (HF's default app_port).
#
# The frontend is NOT built or served here — it deploys separately to Vercel.
# .dockerignore keeps frontend/, node_modules/ and the source photos out of the
# build context.

FROM python:3.11-slim

# HF Spaces require the container to run as a non-root user (UID 1000).
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    # keep TabPFN's downloaded checkpoint inside the writable user cache
    HF_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1

WORKDIR /home/user/app

# Install CPU-only torch first (avoids the multi-GB CUDA build), then the rest.
COPY --chown=user requirements.txt ./
RUN pip install --no-cache-dir --user torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir --user -r requirements.txt

# Copy the Python project (backend + the four failure-mode packages + Data + Src).
COPY --chown=user . ./

EXPOSE 7860

# One worker on purpose: TabPFN inference is heavy and concurrent requests to a
# single model deadlock it. Requests are handled sequentially.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
