import os
import sys
import time
import httpx
import argparse
from pathlib import Path

def get_rpm_limit():
    try:
        return int(os.environ.get("GEMINI_RPM_LIMIT", "12"))
    except ValueError:
        return 12

def main():
    parser = argparse.ArgumentParser(description="Prewarm the SynthID Deep Scan cache for demos.")
    parser.add_argument("image_dir", type=str, help="Directory containing demo images.")
    parser.add_argument("--url", type=str, default="http://localhost:8000/deep-scan", help="API Endpoint URL")
    args = parser.parse_args()

    image_dir = Path(args.image_dir)
    if not image_dir.exists() or not image_dir.is_dir():
        print(f"Error: {image_dir} is not a valid directory.")
        sys.exit(1)

    rpm_limit = get_rpm_limit()
    # Calculate safe delay to stay strictly under the RPM limit
    delay_seconds = 60.0 / rpm_limit
    print(f"Using GEMINI_RPM_LIMIT={rpm_limit}. Delay between requests: {delay_seconds:.2f} seconds.")

    valid_extensions = {".png", ".jpg", ".jpeg", ".webp"}
    images = [p for p in image_dir.iterdir() if p.suffix.lower() in valid_extensions]

    if not images:
        print("No valid images found in directory.")
        sys.exit(0)

    print(f"Found {len(images)} images to prewarm.")

    with httpx.Client(timeout=30.0) as client:
        for idx, img_path in enumerate(images):
            print(f"[{idx+1}/{len(images)}] Prewarming cache for {img_path.name}...")
            
            try:
                with open(img_path, "rb") as f:
                    # Send as multipart form data matching FastAPI `UploadFile = File(...)`
                    files = {"image": (img_path.name, f, f"image/{img_path.suffix.lower().lstrip('.')}")}
                    response = client.post(args.url, files=files)
                
                if response.status_code == 200:
                    print("  ✅ Success (Cached)")
                elif response.status_code == 429:
                    print(f"  ⚠️ Rate Limited: {response.text}")
                else:
                    print(f"  ❌ Error {response.status_code}: {response.text}")

            except Exception as e:
                print(f"  ❌ Request Failed: {str(e)}")

            if idx < len(images) - 1:
                print(f"  Waiting {delay_seconds:.2f}s before next request to avoid 429...")
                time.sleep(delay_seconds)

    print("Prewarming complete!")

if __name__ == "__main__":
    main()
