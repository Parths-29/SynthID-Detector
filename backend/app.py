import sys
import os
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import io
import uuid
import exifread
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

# Add ml directory to path so we can import the extractor
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml')))

from robust_extractor import RobustSynthIDExtractor
from synthid_bypass_v4 import SpectralCodebookV4

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="SynthID Detector API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS for the future frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus Metrics
REQUEST_COUNT = Counter('detect_request_count', 'Total detect requests')
DETECTED_COUNT = Counter('detect_watermark_count', 'Total watermarks detected')
PROCESSING_TIME = Histogram('detect_processing_seconds', 'Time spent processing images')

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Load the codebook once on startup
CODEBOOK_PATH = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'spectral_codebook_v4.npz')
print(f"Loading V4 codebook from {CODEBOOK_PATH}...")
codebook = SpectralCodebookV4()
codebook.load(CODEBOOK_PATH)

extractor = RobustSynthIDExtractor()

@app.post("/detect")
@limiter.limit("10/minute")
async def detect_watermark(request: Request, image: UploadFile = File(...)):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")
    
    REQUEST_COUNT.inc()
    with PROCESSING_TIME.time():
        contents = await image.read()
    
    # Extract EXIF data
    tags = exifread.process_file(io.BytesIO(contents))
    exif_data = {}
    for tag in tags.keys():
        if tag not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote'):
            exif_data[tag] = str(tags[tag])
            
    nparr = np.frombuffer(contents, np.uint8)
    img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img_cv is None:
        raise HTTPException(status_code=400, detail="Could not decode image.")
        
    # Convert BGR to RGB
    img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB)
    
    try:
        # We specify the model as none, it will attempt to match resolution profiles
        result = extractor.detect_from_v4_codebook(
            img_rgb, 
            codebook,
            model=None
        )
        
        if result.is_watermarked:
            DETECTED_COUNT.inc()
            
        return {
            "is_watermarked": result.is_watermarked,
            "confidence": result.confidence,
            "phase_match": result.phase_match,
            "multi_scale_consistency": result.multi_scale_consistency,
            "details": result.details,
            "exif_data": exif_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

batch_jobs = {}

@app.post("/detect-batch")
@limiter.limit("5/minute")
async def detect_batch(request: Request, background_tasks: BackgroundTasks, images: List[UploadFile] = File(...)):
    job_id = str(uuid.uuid4())
    batch_jobs[job_id] = {"status": "processing", "results": [], "total": len(images)}
    
    # Read files into memory to process in background
    files_data = []
    for img in images:
        content = await img.read()
        files_data.append((img.filename, content))
        REQUEST_COUNT.inc()
        
    background_tasks.add_task(process_batch, job_id, files_data)
    return {"job_id": job_id, "status": "processing", "message": "Batch processing started."}

@app.get("/detect-batch/{job_id}")
async def get_batch_status(job_id: str):
    if job_id not in batch_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return batch_jobs[job_id]

def process_batch(job_id: str, files_data: List[tuple]):
    results = []
    for filename, contents in files_data:
        try:
            tags = exifread.process_file(io.BytesIO(contents))
            exif_data = {k: str(v) for k, v in tags.items() if k not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote')}
            
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
                    "exif_data": exif_data
                })
            else:
                results.append({"filename": filename, "error": "Could not decode image"})
        except Exception as e:
            results.append({"filename": filename, "error": str(e)})
            
    batch_jobs[job_id]["status"] = "completed"
    batch_jobs[job_id]["results"] = results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
