<div align="center">
  
# SynthID Detector

**AI Provenance & Authenticity Checker with ResNet50 Classifier, Grad-CAM & Gemini AI**

[![CI Pipeline](https://github.com/Parths-29/SynthID-Detector/actions/workflows/ci.yml/badge.svg)](https://github.com/Parths-29/SynthID-Detector/actions)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

An advanced, production-ready full-stack application designed to verify image authenticity using a **3-Signal Verification Architecture**: a fine-tuned **ResNet50 Deep Learning Classifier** with real **Grad-CAM visual explainability**, a **SynthID Frequency Spectrum (FFT)** + EXIF metadata forensic engine, and a **Gemini Multimodal AI Reasoning Assistant**.

</div>

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js 14)                       │
│   3-Panel Result Dashboard · Interactive Grad-CAM Heatmap        │
│   FFT Spectrum Canvas · Gemini Assistant Chat · History Page     │
│          localhost:3000   (Tailwind CSS + Framer Motion)         │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTP / REST
┌────────────────────────────────▼─────────────────────────────────┐
│                     Backend API (FastAPI)                        │
│   /detect · /classify · /deep-scan · /ask-assistant · /metrics   │
│   Dynamic Rate Limiting (SlowAPI) · CORS · Quota Isolation       │
│          vercel - host   (Python 3.9+ / Starlette)              │
└────────┬───────────────────────┬────────────────────────┬────────┘
         │                       │                        │
┌────────▼────────┐     ┌────────▼────────┐      ┌────────▼────────┐
│  PyTorch ResNet │     │   FFT Spectral  │      │  Google Gemini  │
│  Classifier +   │     │  V4 Codebook    │      │  1.5 Flash API  │
│  Grad-CAM Hooks │     │  EXIF Forensics │      │ Isolated Quotas │
└─────────────────┘     └─────────────────┘      └─────────────────┘
```

---

## 🌟 Key Features

- **Trained Model Verdict (`/classify`)**: Fine-tuned **ResNet50 classifier** trained to detect AI-generated synthetic images versus authentic photographs.
- **Real Grad-CAM Explainability**: Uses PyTorch activation hooks on `layer4` to generate spatial activation heatmaps, visually highlighting exact regions triggering the AI verdict.
- **SynthID Frequency Analysis (`/detect`)**: Extracts invisible Google SynthID watermark patterns using Fast Fourier Transform (FFT) radial spectrum analysis.
- **Metadata Forensics**: Scans EXIF headers and raw byte signatures for AI generator footprints (Midjourney, DALL-E, Google Imagen, DeepMind).
- **Gemini AI Visual Deep Scan (`/deep-scan`)**: Multimodal visual forensic scan identifying structural artifacts, unnatural lighting, or anatomical flaws.
- **Context-Aware AI Assistant (`/ask-assistant`)**: Interactive chatbot trained to explain detection verdicts by fusing all 3 signals without inventing numbers.
- **Dynamic Quota & Rate Limit Coordination**: SlowAPI rate limiter with custom dynamic `Retry-After` headers and isolated API keys.
- **Batch Processing (`/detect-batch`)**: Concurrent background worker queue processing multiple image uploads with job polling.
- **Production Monitoring**: Embedded Prometheus `/metrics` endpoint measuring processing latency, request rates, and watermark match distributions.

---

## 📊 Model Evaluation & Performance

> [!IMPORTANT]
> **Scope & Benchmark Framing:**
> - These metrics are measured **specifically on the CIFAKE benchmark pairing** (CIFAR-10 real camera photographs vs. Stable Diffusion v1.4 synthetic outputs).
> - **Cross-Generator Generalization:** Detectors trained on single generator pairings (such as CIFAR-10 vs. SD v1.4) typically experience significant accuracy drops (often down to 20–30%) when evaluated against unseen, state-of-the-art generators (e.g., Midjourney v7, Flux, Gemini Imagen 3, or Diffusion Transformers).
> - **Sample Size Note:** Evaluated on a 3,000-image subset (2,000 training, 1,000 evaluation) of the broader 120,000-image CIFAKE dataset.

| Metric | Score |
|--------|-------|
| **Benchmark Dataset** | **CIFAKE (CIFAR-10 Photos vs. Stable Diffusion v1.4)** |
| **Test Accuracy** | **93.4%** |
| **ROC AUC** | **0.980** |
| **FAKE Class (Stable Diffusion v1.4) Precision / Recall** | **93.2% / 93.6% (F1 = 0.934)** |
| **REAL Class (CIFAR-10 Photos) Precision / Recall** | **93.6% / 93.2% (F1 = 0.934)** |
| **Evaluation Test Set Size** | **1,000 authentic evaluation samples** |

---

## 🛡️ Out-of-Distribution (OOD) Detection

The model features an OOD layer utilizing **Mahalanobis Distance** measured on the 2048-dimensional feature vectors of the ResNet50 penultimate layer. 
- Distances exceeding the 95th percentile of the validation set trigger an **"Outside trained scope — unverified"** warning.
- This ensures honest reporting when evaluating generators the model hasn't seen during training (like Midjourney or Flux).

---

## 🧩 Browser Extension (Phase 4)

The project includes a Manifest V3 Chrome extension (in the `extension/` directory) for rapid image analysis directly from the browser.

> [!CAUTION]
> ### Important Privacy & Usage Caveats:
> - **Opt-in Scanning Only**: The extension does **not** passively monitor your web traffic or automatically scan images on pages you visit. 
> - **Right-Click Activation**: You must explicitly right-click an image and select "Scan for AI Generation" to trigger an analysis.
> - **Local Network**: The extension sends the selected image strictly to your locally running backend API (`http://localhost:8000/quick-scan`). No images are sent to any external servers (unless you use the Deep Scan feature which queries Gemini, triggered manually from the UI).

---

## 🚀 Quick Start

The fastest way to run the full stack is with Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Launching with Docker Compose

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Parths-29/SynthID-Detector.git
   cd SynthID-Detector
   ```

2. **(Optional) Set Gemini API Keys:**
   ```bash
   export GEMINI_API_KEY="your_primary_key"
   export GEMINI_API_KEY_CHAT="your_secondary_key" # Keeps chatbot and deep-scan quotas isolated
   ```

3. **Start the application:**
   ```bash
   docker-compose up --build
   ```

4. **Access Endpoints:**
   - **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
   - **FastAPI Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Probe:** [http://localhost:8000/health](http://localhost:8000/health)
   - **Prometheus Metrics:** [http://localhost:8000/metrics](http://localhost:8000/metrics)

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + `shadcn/ui` design tokens
- **Animations**: Framer Motion
- **Visualizations**: HTML5 Canvas (FFT spectrum), Grad-CAM Overlays, Custom Confidence Gauges
- **HTTP Client**: Axios with dynamic 429 rate limit parsing

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **ML / DL Framework**: PyTorch, Torchvision (ResNet50, Grad-CAM hooks)
- **Image Processing**: OpenCV, NumPy, SciPy (FFT), Pillow, ExifRead
- **Rate Limiting**: SlowAPI with custom `RateLimitExceeded` dynamic handler
- **AI SDK**: Official `google-genai` client SDK
- **Observability**: `prometheus-client`

---

## 📖 API Reference

### 1. Trained Classifier Endpoint (`POST /classify`)
Runs image through the trained ResNet50 model and returns classification probability and Grad-CAM base64 heatmap overlay.

```bash
curl -X POST -F "image=@sample.jpg" http://localhost:8000/classify
```

**Response:**
```json
{
  "model_status": "ready",
  "probability": 0.948,
  "heatmap": "data:image/png;base64,iVBORw0KGgo...",
  "heatmap_text": "The model shows strong neural activation, primarily focused on the center region."
}
```

### 2. Single Image Detection (`POST /detect`)
Evaluates SynthID FFT spectral codebooks, EXIF metadata, and raw byte signatures.

```bash
curl -X POST -F "image=@sample.jpg" http://localhost:8000/detect
```

### 3. Gemini Multimodal Deep Scan (`POST /deep-scan`)
Analyzes visual artifacts using Gemini 1.5 Flash.

```bash
curl -X POST -F "image=@sample.jpg" http://localhost:8000/deep-scan
```

### 4. Interactive AI Assistant (`POST /ask-assistant`)
Sends user query along with 3-signal detection context to the assistant.

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"Why was this flagged as AI?", "classify_context":{"probability":0.94}}' \
  http://localhost:8000/ask-assistant
```

---

## 🧪 Local Model Training & Evaluation

To re-train or evaluate the ML model locally:

```bash
# 1. Activate environment
source venv/bin/activate

# 2. Generate / Prepare Dataset
python -m ml.download_dataset

# 3. Train ResNet50 Classifier
python -m ml.train_classifier

# 4. Evaluate and Generate Metrics / Visualizations
python -m ml.evaluate

# 5. Run Full PyTest Suite (16 tests)
pytest backend/test_app.py -v
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
