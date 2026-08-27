<h1 align="center">AI Provenance Checker & SynthID Detector</h1>

<p align="center">
  <b>A comprehensive tool for verifying the origin of images through EXIF/C2PA metadata extraction and Google's SynthID invisible watermark detection.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18.2+-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## 🔍 Overview

With the rapid advancement of generative AI, tracing the origin of an image is becoming increasingly difficult. While some generators embed invisible watermarks (like **SynthID**) and others use metadata credentials (like **C2PA**), the landscape is fragmented.

The **AI Provenance Checker** is a full-stack, scalable application designed to bridge this gap. Rather than serving as a narrow watermark checker, this tool scans for multiple provenance signals simultaneously, providing security researchers, ML engineers, and the public with a unified verification platform.

## ✨ Key Features

- 🕵️ **Spectral Watermark Detection:** Utilizes a sophisticated, multi-scale machine learning pipeline to detect Google's SynthID invisible watermarks.
- 📊 **Rich Confidence Metrics:** Returns a detailed per-channel confidence breakdown and phase match percentages, moving beyond simple binary classifications.
- 🏷️ **EXIF & C2PA Metadata Extraction:** Automatically extracts and surfaces standard generator signatures and content credentials embedded in the image file.
- ⚡ **Asynchronous Batch Processing:** Supports drag-and-drop batch uploads, utilizing background tasks and threading to process multiple images efficiently.
- 🛡️ **Rate Limiting & Stability:** Built-in API rate limiting protects the CPU-heavy Fast Fourier Transform (FFT) analysis from abuse and exhaustion.
- 📈 **Prometheus Monitoring:** Integrated `/metrics` endpoint to track request volumes, detection rates, and processing times for production deployments.

---

## 🏗️ Architecture

The project is built on a modern, containerized stack:

1. **Frontend (React + Vite):** A premium, dynamic UI featuring a glassmorphism design, drag-and-drop batch uploads, and interactive result cards.
2. **Backend (FastAPI):** A high-performance Python backend that handles the heavy lifting, manages asynchronous job queues, and serves Prometheus metrics.
3. **ML Engine:** The core signal processing and spectral analysis engine that caches large codebooks in memory for fast inference.

---

## 🚀 Getting Started

The easiest way to run the AI Provenance Checker is using Docker. Ensure you have [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed.

### 1. Clone the repository
```bash
git clone https://github.com/Parths-29/SynthID-Detector.git
cd SynthID-Detector
```

### 2. Start the services
```bash
docker-compose up --build
```

### 3. Access the application
- **Web UI:** `http://localhost:5173`
- **API Documentation (Swagger UI):** `http://localhost:8000/docs`
- **Prometheus Metrics:** `http://localhost:8000/metrics`

---

## 📡 API Endpoints

The FastAPI backend exposes the following key endpoints:

- `POST /detect` - Upload a single image for immediate provenance verification.
- `POST /detect-batch` - Upload multiple images; returns a `job_id` for asynchronous processing.
- `GET /detect-batch/{job_id}` - Poll for the status and results of a batch job.
- `GET /metrics` - Scrape Prometheus metrics (request count, detection rate, processing time).

---

## ⚠️ Disclaimer

This project is for **research and educational purposes only**. SynthID is proprietary technology owned by Google DeepMind. These tools are intended for:
- Academic research on watermarking robustness
- Security analysis of AI-generated content identification
- Understanding spread-spectrum encoding methods

**Do not use these tools to misrepresent AI-generated content as human-created.**

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Parths-29/SynthID-Detector/issues) if you want to contribute.

<p align="center">
  Built with ❤️ for the open-source AI community.
</p>
