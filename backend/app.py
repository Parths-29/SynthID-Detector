"""
SynthID Detector — FastAPI Backend

Provides endpoints for:
- Single image watermark detection (/detect)
- Batch image processing (/detect-batch, /detect-batch/{job_id})
- Health check (/health)
- Prometheus metrics (/metrics)
"""

import sys
import os
import cv2
import numpy as np
import time
import threading
import hashlib
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import io
import uuid
import exifread
from PIL import Image
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .classifier import classifier_instance
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from google import genai

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_KEY_CHAT = os.getenv("GEMINI_API_KEY_CHAT")
if not GEMINI_API_KEY_CHAT:
    import sys
    print("\n" + "="*80, file=sys.stderr)
    print("CRITICAL WARNING: GEMINI_API_KEY_CHAT is not set!", file=sys.stderr)
    print("Falling back to the primary GEMINI_API_KEY. /deep-scan and /ask-assistant will", file=sys.stderr)
    print("share quota, completely breaking isolation and causing starvation.", file=sys.stderr)
    print("="*80 + "\n", file=sys.stderr)
    GEMINI_API_KEY_CHAT = GEMINI_API_KEY

GEMINI_RPM_LIMIT = os.getenv("GEMINI_RPM_LIMIT", "12")

# Initialize isolated clients
deep_scan_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
chat_client = genai.Client(api_key=GEMINI_API_KEY_CHAT) if GEMINI_API_KEY_CHAT else None

# Add ml directory to path so we can import the extractor
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml')))

from robust_extractor import RobustSynthIDExtractor
from synthid_bypass_v4 import SpectralCodebookV4

# ---------------------------------------------------------------------------
# MongoDB placeholder — uncomment and configure when ready
# ---------------------------------------------------------------------------
# from motor.motor_asyncio import AsyncIOMotorClient
#
# MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
# MONGO_DB  = os.getenv("MONGO_DB", "synthid_detector")
#
# mongo_client: Optional[AsyncIOMotorClient] = None
# db = None
#
# @app.on_event("startup")
# async def startup_db():
#     global mongo_client, db
#     mongo_client = AsyncIOMotorClient(MONGO_URI)
#     db = mongo_client[MONGO_DB]
#
# @app.on_event("shutdown")
# async def shutdown_db():
#     if mongo_client:
#         mongo_client.close()
# ---------------------------------------------------------------------------

# ── App & middleware ────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="SynthID Detector API",
    description="Detect invisible AI watermarks in images using spectral analysis",
    version="2.0.0",
)
app.state.limiter = limiter

def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    temp_resp = Response()
    temp_resp = request.app.state.limiter._inject_headers(temp_resp, request.state.view_rate_limit)
    retry_after = temp_resp.headers.get("retry-after", "60")
    
    response = JSONResponse(
        {"status": "rate_limited", "retry_after_seconds": int(retry_after)},
        status_code=429
    )
    response.headers["Retry-After"] = retry_after
    return response

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# CORS — configurable via environment variable
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics ──────────────────────────────────────────────────────

REQUEST_COUNT = Counter('detect_request_count', 'Total detect requests')
DETECTED_COUNT = Counter('detect_watermark_count', 'Total watermarks detected')
PROCESSING_TIME = Histogram('detect_processing_seconds', 'Time spent processing images')


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ── Health endpoint ─────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check for Docker / Kubernetes readiness probes."""
    return {"status": "ok", "version": "2.0.0"}


# ── Load ML models on startup ──────────────────────────────────────────────

CODEBOOK_PATH = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'spectral_codebook_v4.npz')
print(f"Loading V4 codebook from {CODEBOOK_PATH}...")
codebook = SpectralCodebookV4()
codebook.load(CODEBOOK_PATH)

extractor = RobustSynthIDExtractor()


# ── Batch job store with TTL ────────────────────────────────────────────────

BATCH_JOB_TTL_SECONDS = int(os.getenv("BATCH_JOB_TTL", "3600"))  # 1 hour default

batch_jobs: dict = {}
_batch_lock = threading.Lock()

# ── SHA-256 Cache ───────────────────────────────────────────────────────────
_detection_cache = {}
_deep_scan_cache = {}


def _cleanup_expired_jobs():
    """Remove batch jobs older than TTL."""
    now = time.time()
    with _batch_lock:
        expired = [jid for jid, job in batch_jobs.items()
                   if now - job.get("created_at", now) > BATCH_JOB_TTL_SECONDS]
        for jid in expired:
            del batch_jobs[jid]


# ── Helper: extract EXIF data ──────────────────────────────────────────────

def _extract_exif(contents: bytes) -> dict:
    """Extract EXIF metadata from raw image bytes."""
    tags = exifread.process_file(io.BytesIO(contents))
    return {
        k: str(v)
        for k, v in tags.items()
        if k not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote')
    }


# ── Single image detection ─────────────────────────────────────────────────

@app.post("/detect")
@limiter.limit(f"{GEMINI_RPM_LIMIT}/minute")
async def detect_watermark(request: Request, image: UploadFile = File(...)):
    """
    Analyze a single image for SynthID watermarks.

    Returns detection result with confidence score, phase match,
    multi-scale consistency, frequency spectrum data, and EXIF metadata.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    REQUEST_COUNT.inc()
    start_time = time.time()
    try:
        contents = await image.read()
        file_hash = hashlib.sha256(contents).hexdigest()
        
        if file_hash in _detection_cache:
            REQUEST_COUNT.inc()
            return _detection_cache[file_hash]

        # Extract EXIF data
        exif_data = _extract_exif(contents)

        nparr = np.frombuffer(contents, np.uint8)
        img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_cv is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)

        with PROCESSING_TIME.time():
            result = extractor.detect_from_v4_codebook(
                img_rgb,
                codebook,
                model=None
            )

        # --- METADATA SIGNATURE CHECK ---
        exif_str = str(exif_data).lower()
        contents_lower = contents.lower()
        
        has_exif_sig = "google" in exif_str or "gemini" in exif_str or "deepmind" in exif_str
        has_byte_sig = b"google" in contents_lower or b"gemini" in contents_lower or b"deepmind" in contents_lower
        
        result.details["metadata_signature_found"] = bool(has_exif_sig or has_byte_sig)

        if result.is_watermarked:
            DETECTED_COUNT.inc()

        processing_time_ms = round((time.time() - start_time) * 1000, 2)

        # Build frequency spectrum data for frontend visualization
        spectrum_data = _compute_spectrum_data(img_rgb)

        response = {
            "is_watermarked": result.is_watermarked,
            "confidence": result.confidence,
            "phase_match": result.phase_match,
            "multi_scale_consistency": result.multi_scale_consistency,
            "details": result.details,
            "exif_data": exif_data,
            "processing_time_ms": processing_time_ms,
            "spectrum_data": spectrum_data,
        }

        _detection_cache[file_hash] = response
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch image detection ──────────────────────────────────────────────────

@app.post("/detect-batch")
@limiter.limit("5/minute")
async def detect_batch(
    request: Request,
    background_tasks: BackgroundTasks,
    images: List[UploadFile] = File(...)
):
    """Submit multiple images for background batch processing."""
    _cleanup_expired_jobs()  # housekeeping

    job_id = str(uuid.uuid4())

    # Read files into memory to process in background
    files_data = []
    for img in images:
        content = await img.read()
        files_data.append((img.filename, content))
        REQUEST_COUNT.inc()

    with _batch_lock:
        batch_jobs[job_id] = {
            "status": "processing",
            "results": [],
            "total": len(images),
            "created_at": time.time(),
        }

    background_tasks.add_task(process_batch, job_id, files_data)
    return {"job_id": job_id, "status": "processing", "message": "Batch processing started."}


@app.get("/detect-batch/{job_id}")
async def get_batch_status(job_id: str):
    """Poll batch job status and retrieve results when complete."""
    if job_id not in batch_jobs:
        raise HTTPException(status_code=404, detail="Job not found or expired.")
    return batch_jobs[job_id]


# ── AI Assistant Endpoint ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    detection_context: Optional[dict] = None
    deep_scan_context: Optional[dict] = None
    classify_context: Optional[dict] = None

@app.post("/ask-assistant")
@limiter.limit(f"{GEMINI_RPM_LIMIT}/minute")
async def ask_assistant(request: Request, chat_req: ChatRequest):
    """Chat with the Gemini Assistant about the image analysis."""
    try:
        
        prompt = f"User Question: {chat_req.message}\n\n"
        if chat_req.detection_context:
            prompt += f"Context (Watermark & Metadata):\n{chat_req.detection_context}\n\n"
        if chat_req.classify_context:
            prompt += f"Context (Trained Model Verdict):\n{chat_req.classify_context}\n\n"
        if chat_req.deep_scan_context:
            prompt += f"Context (AI Narrative):\n{chat_req.deep_scan_context}\n\n"
            
        prompt += (
            "System Instructions:\n"
            "Answer using only the provided signals above. "
            "Do not state a new confidence number or invent your own probability. "
            "Do not contradict the provided panels. "
            "If asked what you think about the image's authenticity, defer to the trained model's probability as the primary number."
        )
            
        # Using google-genai
        response = await chat_client.aio.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt
        )
        return {"response": response.text}
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "Quota exceeded" in error_msg:
            return {"response": "I'm receiving too many requests right now (rate limit exceeded). Please try again in about a minute!"}
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/classify")
@limiter.limit(f"{GEMINI_RPM_LIMIT}/minute")
async def classify_image(request: Request, image: UploadFile = File(...)):
    """Run the image through the trained PyTorch classification model."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")
        
    contents = await image.read()
    return classifier_instance.run_inference(contents)


@app.post("/deep-scan")
@limiter.limit(f"{GEMINI_RPM_LIMIT}/minute")
async def deep_scan(request: Request, image: UploadFile = File(...)):
    """Visually analyze image for AI artifacts using Gemini."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")
        
    contents = await image.read()
    file_hash = hashlib.sha256(contents).hexdigest()
    
    if file_hash in _deep_scan_cache:
        return _deep_scan_cache[file_hash]
        
    try:
        pil_image = Image.open(io.BytesIO(contents))
        
        prompt = (
            "Analyze this image for visual artifacts typical of AI generation "
            "(Midjourney, DALL-E, Stable Diffusion, Gemini). Look for unnatural textures, "
            "strange text, anatomical errors, bizarre lighting, or excessive symmetry. "
            "Return your response in exactly this format:\n"
            "Likelihood: [Low / Medium / High]\n"
            "Reasoning: [Your detailed forensic reasoning]"
        )
        
        # Using google-genai
        response = await deep_scan_client.aio.models.generate_content(
            model='gemini-1.5-flash',
            contents=[prompt, pil_image]
        )
        text = response.text
        
        likelihood = "Medium"
        if "Likelihood: Low" in text:
            likelihood = "Low"
        elif "Likelihood: High" in text:
            likelihood = "High"
            
        reasoning = text.split("Reasoning:")[-1].strip() if "Reasoning:" in text else text
        
        result = {
            "likelihood": likelihood,
            "reasoning": reasoning
        }
        _deep_scan_cache[file_hash] = result
        return result
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "Quota exceeded" in error_msg:
            raise HTTPException(status_code=429, detail="API rate limit exceeded. Please try again later.")
        raise HTTPException(status_code=500, detail=error_msg)


def process_batch(job_id: str, files_data: List[tuple]):
    """Background worker that processes a batch of images."""
    results = []
    for filename, contents in files_data:
        try:
            exif_data = _extract_exif(contents)
            nparr = np.frombuffer(contents, np.uint8)
            img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img_cv is not None:
                img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)

                with PROCESSING_TIME.time():
                    res = extractor.detect_from_v4_codebook(img_rgb, codebook, model=None)

                if res.is_watermarked:
                    DETECTED_COUNT.inc()

                results.append({
                    "filename": filename,
                    "is_watermarked": res.is_watermarked,
                    "confidence": res.confidence,
                    "phase_match": res.phase_match,
                    "exif_data": exif_data,
                })
            else:
                results.append({"filename": filename, "error": "Could not decode image"})
        except Exception as e:
            results.append({"filename": filename, "error": str(e)})

    with _batch_lock:
        batch_jobs[job_id]["status"] = "completed"
        batch_jobs[job_id]["results"] = results


# ── Spectrum data helper ───────────────────────────────────────────────────

def _compute_spectrum_data(img_rgb: np.ndarray, num_rings: int = 32) -> dict:
    """
    Compute radial frequency spectrum for frontend visualization.
    Returns ring energies and the peak ring index.
    """
    try:
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY).astype(np.float64)
        h, w = gray.shape
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude = np.log1p(np.abs(f_shift))

        cy, cx = h // 2, w // 2
        max_radius = min(cy, cx)
        ring_width = max(1, max_radius // num_rings)

        ring_energies = []
        for i in range(num_rings):
            r_inner = i * ring_width
            r_outer = (i + 1) * ring_width
            y, x = np.ogrid[:h, :w]
            dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            mask = (dist >= r_inner) & (dist < r_outer)
            if mask.any():
                ring_energies.append(float(np.mean(magnitude[mask])))
            else:
                ring_energies.append(0.0)

        # Normalize to 0-1
        max_e = max(ring_energies) if ring_energies else 1.0
        if max_e > 0:
            ring_energies = [e / max_e for e in ring_energies]

        peak_ring = int(np.argmax(ring_energies[1:])) + 1  # skip DC component

        return {
            "ring_energies": ring_energies,
            "peak_ring": peak_ring,
            "num_rings": num_rings,
        }
    except Exception:
        return {"ring_energies": [], "peak_ring": 0, "num_rings": num_rings}


# ── Main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
