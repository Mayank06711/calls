# ── Stage 1: Install deps ──
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.slim.txt .

# Install headless opencv FIRST, then everything else.
# mediapipe wants opencv-contrib-python but headless is already installed
# so pip skips it (opencv-python-headless satisfies the cv2 import).
# The constraint file blocks contrib from ever being installed.
RUN pip install --no-cache-dir --upgrade pip && \
    echo "opencv-contrib-python" > /tmp/constraints.txt && \
    PIP_CONSTRAINT=/tmp/constraints.txt \
    pip install --no-cache-dir --timeout=600 --retries=10 \
    -r requirements.slim.txt && \
    rm -rf /tmp/constraints.txt && \
    # Remove only truly unused bloat
    pip uninstall -y sounddevice 2>/dev/null; \
    rm -rf /usr/local/lib/python3.11/site-packages/sympy \
           /usr/local/lib/python3.11/site-packages/mpmath \
           /usr/local/lib/python3.11/site-packages/networkx \
           /usr/local/lib/python3.11/site-packages/pip \
           /usr/local/lib/python3.11/site-packages/setuptools* \
           /usr/local/lib/python3.11/site-packages/pkg_resources && \
    find /usr/local/lib/python3.11/site-packages -type d \( -name "tests" -o -name "test" -o -name "docs" -o -name "examples" \) -exec rm -rf {} + 2>/dev/null; \
    true

# ── Stage 2: Minimal runtime ──
FROM python:3.11-slim

WORKDIR /app

# System libs needed by: mediapipe (libegl1, libgles2), opencv (libgl1), general (libglib2.0-0)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libglib2.0-0 libgl1 libegl1 libgles2 && \
    rm -rf /var/lib/apt/lists/* && \
    adduser --disabled-password --no-create-home appuser

# Copy ALL installed packages from builder (no --target tricks, exact same layout as local venv)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin /usr/local/bin/

COPY main.py config.py ./
COPY models/ ./models/
COPY services/ ./services/
COPY utils/ ./utils/
COPY yolo_models/ ./yolo_models/

ENV U2NET_HOME=/app/.model_cache
RUN mkdir -p /app/.model_cache && chown appuser:appuser /app/.model_cache

ENV PORT=8001 ENV=production PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    MPLCONFIGDIR=/tmp/matplotlib \
    NUMBA_CACHE_DIR=/tmp/numba_cache
EXPOSE 8001
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
