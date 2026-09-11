FROM python:3.9-slim

WORKDIR /app

# System dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY ml/ ./ml/
COPY artifacts/ ./artifacts/

# Fetch weights using wget --fail. If these URLs are not updated by the user, the build will fail loudly.
RUN mkdir -p ml/weights && \
    wget --fail -O ml/weights/aigi_classifier.pt "https://REPLACE_ME_URL_FOR_AIGI_CLASSIFIER_PT" && \
    wget --fail -O ml/weights/aigi_classifier_state.pth "https://REPLACE_ME_URL_FOR_AIGI_CLASSIFIER_STATE_PTH" && \
    wget --fail -O ml/weights/ood_stats.npz "https://REPLACE_ME_URL_FOR_OOD_STATS_NPZ"

EXPOSE 8000

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
