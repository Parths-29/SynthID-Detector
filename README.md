<div align="center">
  
# SynthID Detector

**AI Provenance & Authenticity Checker**

[![CI Pipeline](https://github.com/Parths-29/SynthID-Detector/actions/workflows/ci.yml/badge.svg)](https://github.com/Parths-29/SynthID-Detector/actions)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

An advanced, production-ready tool designed to verify image authenticity. It uses a watermark-inspired frequency heuristic (FFT), analyzes EXIF metadata/raw byte signatures, and provides an AI Visual Deep Scan fallback to help you distinguish between human-made and AI-generated imagery.

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                │
│  Landing Page · Chat Interface · History · Visualizations│
│         localhost:3000   (Tailwind + Framer Motion)      │
└──────────────────────────┬──────────────────────────────┘
                           │  HTTP / REST
┌──────────────────────────▼──────────────────────────────┐
│                    Backend (FastAPI)                      │
│   /detect · /detect-batch · /health · /metrics           │
│       Rate Limiting · CORS · Prometheus                  │
│         localhost:8000   (Python 3.9+)                   │
└────────┬──────────────────────────┬─────────────────────┘
         │                          │
┌────────▼────────┐      ┌─────────▼──────────┐
│   ML Engine     │      │   MongoDB (soon)    │
│  FFT · ICA/PCA  │      │   Scan History &    │
│  Spectral V4    │      │   User Analytics    │
│  Codebook       │      │                     │
└─────────────────┘      └────────────────────┘
```

---

## 🌟 Key Features

- **SynthID Detection**: Accurately extracts and verifies Google's invisible SynthID watermarks using FFT frequency analysis.
- **Metadata Forensics**: Uncovers hidden metadata strings embedded by AI generators (like Midjourney, DALL-E, etc.).
- **Deep Visual Scan**: A fallback multimodal AI analysis that inspects images for visual artifacts (unnatural textures, anatomy errors) when invisible watermarks are destroyed.
- **Batch Processing**: Upload images via the batch endpoint, and background workers will process them concurrently without blocking the server.
- **Frequency Spectrum Visualization**: See the actual FFT ring energies in a real-time canvas visualization — understand *why* the detector flagged an image.
- **Scan History**: Review past scans with filtering, confidence scores, and timestamps.
- **Stunning Interface**: Features a beautiful, animated dark-mode UI built with Next.js, shadcn/ui, Framer Motion, and Tailwind CSS.
- **Production Monitoring**: Built-in Prometheus metrics (`/metrics`) to track detection latency, throughput, and watermark match confidence distributions.

---

## 🚀 Quick Start

The easiest way to run the entire stack is with Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Parths-29/SynthID-Detector.git
   cd SynthID-Detector
   ```

2. **Start the services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
   - **Prometheus Metrics:** [http://localhost:8000/metrics](http://localhost:8000/metrics)

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + `shadcn/ui` variables
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **Image Processing**: OpenCV, NumPy, SciPy (FFT)
- **Concurrency**: Starlette BackgroundTasks
- **Observability**: `prometheus-client`
- **Rate Limiting**: SlowAPI

### Database (Coming Soon)
- **MongoDB** via Motor (async driver) for persistent scan history

---

## 📖 API Usage

### Health Check

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "ok",
  "version": "2.0.0"
}
```

### Single Image Scan

```bash
curl -X POST -F "image=@test-image.jpg" http://localhost:8000/detect
```

**Response:**
```json
{
  "is_watermarked": true,
  "confidence": 0.94,
  "details": {
    "metadata_signature_found": true
  },
  "exif_data": {
    "Image Software": "Google Imagen"
  }
}
```

### `POST /deep-scan`
Upload an image to get a qualitative AI visual assessment (Low/Medium/High likelihood) based on artifacts in the image.

### `POST /detect-batch`
Submit multiple images for background processing. Returns a `job_id`.

### `GET /detect-batch/{job_id}`
Poll the status of a background batch job. Returns `processing` or `completed` with the array of results.

### Batch Image Scan

```bash
curl -X POST -F "images=@img1.jpg" -F "images=@img2.png" http://localhost:8000/detect-batch
```

**Response:**
```json
{
  "job_id": "b78a9c...",
  "status": "processing"
}
```

---

## 💻 Local Development

If you prefer to run the components locally without Docker:

### Backend
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000
```

### Frontend
```bash
cd frontend
# Make sure you are using Node 18+
npm install
npm run dev
```

### Running Tests
```bash
source venv/bin/activate
pytest backend/test_app.py -v
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
