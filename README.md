<div align="center">
  
# SynthID Detector

**AI Provenance & Authenticity Checker**

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

An advanced, production-ready tool designed to verify image authenticity. It scans for Google's SynthID invisible watermarks, analyzes EXIF metadata, and extracts C2PA content credentials to help you distinguish between human-made and AI-generated imagery.

</div>

---

## 🌟 Key Features

- **SynthID Detection**: Accurately extracts and verifies Google's invisible SynthID watermarks using FFT frequency analysis.
- **C2PA & EXIF Metadata**: Uncovers hidden metadata strings and content credentials embedded by AI generators (like Midjourney, DALL-E, etc.).
- **Batch Processing**: Need to scan thousands of images? Upload them via the batch endpoint, and background workers will process them concurrently without blocking the server.
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
   git clone https://github.com/yourusername/synthid-detector.git
   cd synthid-detector
   ```

2. **Start the services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - **Frontend UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
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

---

## 📖 API Usage

### Single Image Scan

```bash
curl -X POST -F "file=@test-image.jpg" http://localhost:8000/detect
```

**Response:**
```json
{
  "has_synthid": true,
  "confidence": 0.94,
  "c2pa_data": {
    "software": "Google Imagen",
    "ai_generated": true
  },
  "processing_time_ms": 145
}
```

### Batch Image Scan

```bash
curl -X POST -F "files=@img1.jpg" -F "files=@img2.png" http://localhost:8000/detect-batch
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

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
