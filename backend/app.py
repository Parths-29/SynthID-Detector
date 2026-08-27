import sys
import os
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Add core directory to path so we can import the extractor
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'core')))

from robust_extractor import RobustSynthIDExtractor
from synthid_bypass_v4 import SpectralCodebookV4

app = FastAPI(title="SynthID Detector API")

# Enable CORS for the future frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the codebook once on startup
CODEBOOK_PATH = os.path.join(os.path.dirname(__file__), '..', 'artifacts', 'spectral_codebook_v4.npz')
print(f"Loading V4 codebook from {CODEBOOK_PATH}...")
codebook = SpectralCodebookV4()
codebook.load(CODEBOOK_PATH)

extractor = RobustSynthIDExtractor()

@app.post("/detect")
async def detect_watermark(image: UploadFile = File(...)):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")
    
    contents = await image.read()
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
        
        return {
            "is_watermarked": result.is_watermarked,
            "confidence": result.confidence,
            "phase_match": result.phase_match,
            "multi_scale_consistency": result.multi_scale_consistency,
            "details": result.details
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
