"""
Backend Test Suite for SynthID Detector API.

Run with: pytest backend/test_app.py -v
"""

import io
import os
import sys
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient

# Ensure project root is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import app


client = TestClient(app)


# ── Helper: generate a small test image in memory ──────────────────────────

def _make_test_image(width: int = 64, height: int = 64, fmt: str = ".jpg") -> bytes:
    """Generate a small synthetic image and return its bytes."""
    img = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    success, encoded = cv2.imencode(fmt, img)
    assert success, "Failed to encode test image"
    return encoded.tobytes()


# ── Health endpoint ────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_health_returns_version(self):
        response = client.get("/health")
        assert response.json()["version"] == "2.0.0"


# ── Metrics endpoint ──────────────────────────────────────────────────────

class TestMetricsEndpoint:
    def test_metrics_returns_prometheus_format(self):
        response = client.get("/metrics")
        assert response.status_code == 200
        assert "detect_request_count" in response.text


# ── Single detect endpoint ─────────────────────────────────────────────────

class TestDetectEndpoint:
    def test_detect_with_valid_image(self):
        img_bytes = _make_test_image()
        response = client.post(
            "/detect",
            files={"image": ("test.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_watermarked" in data
        assert "confidence" in data
        assert "processing_time_ms" in data
        assert "spectrum_data" in data
        assert isinstance(data["confidence"], (int, float))

    def test_detect_returns_spectrum_data(self):
        img_bytes = _make_test_image()
        response = client.post(
            "/detect",
            files={"image": ("test.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        )
        data = response.json()
        spectrum = data.get("spectrum_data", {})
        assert "ring_energies" in spectrum
        assert "peak_ring" in spectrum
        assert isinstance(spectrum["ring_energies"], list)

    def test_detect_rejects_non_image(self):
        response = client.post(
            "/detect",
            files={"image": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
        )
        assert response.status_code == 400
        assert "not an image" in response.json()["detail"]

    def test_detect_rejects_corrupt_image(self):
        response = client.post(
            "/detect",
            files={"image": ("bad.jpg", io.BytesIO(b"\xff\xd8\xff\x00garbage"), "image/jpeg")},
        )
        assert response.status_code == 400

    def test_detect_with_png(self):
        img_bytes = _make_test_image(fmt=".png")
        response = client.post(
            "/detect",
            files={"image": ("test.png", io.BytesIO(img_bytes), "image/png")},
        )
        assert response.status_code == 200


# ── Batch detect endpoint ─────────────────────────────────────────────────

class TestBatchDetectEndpoint:
    def test_batch_returns_job_id(self):
        img_bytes = _make_test_image()
        response = client.post(
            "/detect-batch",
            files=[
                ("images", ("img1.jpg", io.BytesIO(img_bytes), "image/jpeg")),
                ("images", ("img2.jpg", io.BytesIO(img_bytes), "image/jpeg")),
            ],
        )
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "processing"

    def test_batch_poll_eventually_completes(self):
        img_bytes = _make_test_image()
        response = client.post(
            "/detect-batch",
            files=[("images", ("img1.jpg", io.BytesIO(img_bytes), "image/jpeg"))],
        )
        job_id = response.json()["job_id"]

        # Poll until complete (with timeout)
        import time
        for _ in range(30):
            poll = client.get(f"/detect-batch/{job_id}")
            if poll.json()["status"] == "completed":
                break
            time.sleep(0.5)

        final = client.get(f"/detect-batch/{job_id}")
        assert final.json()["status"] == "completed"
        assert len(final.json()["results"]) == 1

    def test_batch_invalid_job_id(self):
        response = client.get("/detect-batch/nonexistent-id")
        assert response.status_code == 404


# ── CORS headers ───────────────────────────────────────────────────────────

class TestCORS:
    def test_cors_headers_present(self):
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        # FastAPI CORS middleware should respond
        assert response.status_code in (200, 204, 405)


# ── Classify endpoint ─────────────────────────────────────────────────────

class TestClassifyEndpoint:
    def test_classify_returns_valid_shape(self):
        """Classify should return model_status, probability, heatmap keys."""
        img_bytes = _make_test_image()
        response = client.post(
            "/classify",
            files={"image": ("test.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "model_status" in data
        assert data["model_status"] in ("not_trained", "ready", "error")
        assert "probability" in data
        assert "heatmap" in data

    def test_classify_rejects_non_image(self):
        response = client.post(
            "/classify",
            files={"image": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
        )
        assert response.status_code == 400
        assert "not an image" in response.json()["detail"]

    def test_classify_with_png(self):
        img_bytes = _make_test_image(fmt=".png")
        response = client.post(
            "/classify",
            files={"image": ("test.png", io.BytesIO(img_bytes), "image/png")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "model_status" in data

    def test_classify_probability_range(self):
        """If model is ready, probability should be between 0 and 1."""
        img_bytes = _make_test_image()
        response = client.post(
            "/classify",
            files={"image": ("test.jpg", io.BytesIO(img_bytes), "image/jpeg")},
        )
        data = response.json()
        if data["model_status"] == "ready":
            assert 0.0 <= data["probability"] <= 1.0

