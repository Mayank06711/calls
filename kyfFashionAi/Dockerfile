# ── Stage 1: Install deps ──
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.slim.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --timeout=600 --retries=10 \
    --target=/build/site-packages -r requirements.slim.txt && \
    # Remove only genuinely unused transitive deps
    rm -rf /build/site-packages/sympy \
           /build/site-packages/mpmath \
           /build/site-packages/networkx \
           /build/site-packages/pip \
           /build/site-packages/setuptools* \
           /build/site-packages/pkg_resources \
           /build/site-packages/sounddevice* \
           /build/site-packages/_sounddevice* && \
    # mediapipe pulls opencv-contrib-python which conflicts with headless
    # Remove contrib, reinstall headless so cv2 binary links to headless .libs
    rm -rf /build/site-packages/opencv_contrib_python* \
           /build/site-packages/opencv_contrib_python.libs && \
    pip install --no-cache-dir --target=/build/site-packages \
        --force-reinstall --no-deps opencv-python-headless==4.13.0.92 && \
    # Strip test dirs and bytecode from packages
    find /build/site-packages -type d \( -name "tests" -o -name "test" -o -name "docs" -o -name "examples" \) -exec rm -rf {} + 2>/dev/null; \
    find /build/site-packages -name "*.pyc" -o -name "*.pyo" | xargs rm -f 2>/dev/null; \
    true

# ── Stage 2: Minimal runtime ──
FROM python:3.11-slim

WORKDIR /app

# libgl1 + libegl1 + libgles2 = mediapipe native inference needs OpenGL ES
# libglib2.0-0 = opencv + general C lib dependency
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libglib2.0-0 libgl1 libegl1 libgles2 && \
    rm -rf /var/lib/apt/lists/* && \
    adduser --disabled-password --no-create-home appuser

# Copy installed packages (no venv, no gcc in final image)
COPY --from=builder /build/site-packages /usr/local/lib/python3.11/site-packages/

COPY main.py config.py ./
COPY models/ ./models/
COPY services/ ./services/
COPY utils/ ./utils/
COPY yolo_models/ ./yolo_models/

ENV U2NET_HOME=/app/.model_cache
RUN mkdir -p /app/.model_cache && chown appuser:appuser /app/.model_cache

ENV PORT=8001 ENV=production PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    MPLCONFIGDIR=/tmp/matplotlib \
    LD_LIBRARY_PATH=/usr/local/lib/python3.11/site-packages/opencv_python_headless.libs:/usr/local/lib/python3.11/site-packages/pillow.libs:/usr/local/lib/python3.11/site-packages/numpy.libs:/usr/local/lib/python3.11/site-packages/scipy.libs
EXPOSE 8001
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
