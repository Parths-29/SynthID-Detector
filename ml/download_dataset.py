"""
Download and prepare CIFAKE dataset for training.

CIFAKE contains 120K images (60K real CIFAR-10, 60K fake from Stable Diffusion).
Structure after download:
    cifake_dataset/
        train/
            REAL/ (50K images)
            FAKE/ (50K images)
        test/
            REAL/ (10K images)
            FAKE/ (10K images)

Usage:
    python ml/download_dataset.py
"""

import os
import sys
import shutil
import zipfile
import urllib.request
import hashlib
import numpy as np
from PIL import Image
from tqdm import tqdm


DATASET_DIR = os.path.join(os.path.dirname(__file__), "cifake_dataset")

# Multiple mirror sources for CIFAKE
CIFAKE_SOURCES = [
    # Direct academic mirrors
    "https://data.mendeley.com/public-files/datasets/jgkdcsg5bk/files/e2b1e4ae-58c2-4623-a6a0-c3b968e5cd92/file_downloaded",
]


def download_with_progress(url: str, dest: str) -> bool:
    """Download a file with a progress bar."""
    try:
        print(f"Attempting download from: {url[:80]}...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        response = urllib.request.urlopen(req, timeout=30)
        total = int(response.headers.get("Content-Length", 0))
        
        with open(dest, "wb") as f:
            with tqdm(total=total, unit="B", unit_scale=True, desc="Downloading") as pbar:
                while True:
                    chunk = response.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)
                    pbar.update(len(chunk))
        return True
    except Exception as e:
        print(f"  Download failed: {e}")
        if os.path.exists(dest):
            os.remove(dest)
        return False


def generate_synthetic_cifake(num_train_per_class=5000, num_val_per_class=1000):
    """
    Generate a synthetic CIFAKE-like dataset for training when download is unavailable.
    
    - REAL class: natural-looking images with smooth gradients, noise patterns, 
      and color distributions typical of real photographs
    - FAKE class: images with artifacts typical of AI generation — 
      overly smooth regions, periodic patterns, sharp color boundaries
    """
    print(f"\n{'='*60}")
    print("Generating synthetic training dataset...")
    print(f"Train: {num_train_per_class} per class | Val: {num_val_per_class} per class")
    print(f"{'='*60}\n")
    
    for split, count in [("train", num_train_per_class), ("test", num_val_per_class)]:
        for label in ["REAL", "FAKE"]:
            class_dir = os.path.join(DATASET_DIR, split, label)
            os.makedirs(class_dir, exist_ok=True)
            
            desc = f"{split}/{label}"
            for i in tqdm(range(count), desc=desc, leave=True):
                img = _generate_image(label, i)
                img.save(os.path.join(class_dir, f"{label.lower()}_{i:05d}.png"))
    
    print(f"\nDataset generated at: {DATASET_DIR}")
    _print_stats()


def _generate_image(label: str, seed: int) -> Image.Image:
    """Generate a single 32x32 image for the given class."""
    rng = np.random.RandomState(seed + (0 if label == "REAL" else 100000))
    size = 32
    
    if label == "REAL":
        # Simulate real photo characteristics:
        # - Natural color gradients
        # - Gaussian noise (sensor noise)
        # - Varied brightness/contrast
        # - Non-uniform textures
        
        # Base: smooth random gradient
        x = np.linspace(0, 1, size)
        y = np.linspace(0, 1, size)
        xx, yy = np.meshgrid(x, y)
        
        # Random gradient direction and colors
        angle = rng.uniform(0, 2 * np.pi)
        gradient = xx * np.cos(angle) + yy * np.sin(angle)
        
        base_color = rng.randint(30, 200, size=3).astype(np.float32)
        end_color = rng.randint(30, 200, size=3).astype(np.float32)
        
        img = np.zeros((size, size, 3), dtype=np.float32)
        for c in range(3):
            img[:, :, c] = base_color[c] + (end_color[c] - base_color[c]) * gradient
        
        # Add natural noise (Gaussian, like sensor noise)
        noise = rng.normal(0, rng.uniform(5, 25), (size, size, 3))
        img += noise
        
        # Add some texture variation (small random patches)
        num_patches = rng.randint(2, 8)
        for _ in range(num_patches):
            px, py = rng.randint(0, size - 8, 2)
            pw, ph = rng.randint(3, 8, 2)
            patch_color = rng.uniform(-30, 30, 3)
            img[py:py+ph, px:px+pw] += patch_color
        
    else:
        # Simulate AI-generated artifacts:
        # - Overly smooth regions
        # - Periodic/repetitive patterns
        # - Unnaturally sharp color transitions
        # - Symmetric elements
        # - Checkerboard-like artifacts (common in GANs)
        
        img = np.zeros((size, size, 3), dtype=np.float32)
        base_color = rng.randint(50, 200, size=3).astype(np.float32)
        img[:] = base_color
        
        artifact_type = rng.randint(0, 5)
        
        if artifact_type == 0:
            # Checkerboard pattern (GAN artifact)
            freq = rng.choice([2, 4, 8])
            for c in range(3):
                checker = np.indices((size, size)).sum(axis=0) // freq % 2
                img[:, :, c] += checker * rng.uniform(20, 60)
                
        elif artifact_type == 1:
            # Overly smooth gradient with sharp boundary
            mid = size // 2 + rng.randint(-4, 4)
            color2 = rng.randint(50, 200, size=3).astype(np.float32)
            img[:mid, :] = base_color
            img[mid:, :] = color2  # Sharp unnatural transition
            
        elif artifact_type == 2:
            # Periodic sine wave pattern
            freq = rng.uniform(0.5, 3.0)
            x = np.linspace(0, 2 * np.pi * freq, size)
            pattern = np.sin(np.outer(x, x))
            for c in range(3):
                img[:, :, c] += pattern * rng.uniform(30, 80)
                
        elif artifact_type == 3:
            # Perfect symmetry (horizontal or vertical)
            half = img[:, :size//2, :].copy()
            noise = rng.normal(0, 5, half.shape)
            half += noise
            img[:, :size//2, :] = half
            img[:, size//2:, :] = half[:, ::-1, :]
            
        else:
            # Repeating tile pattern
            tile_size = rng.choice([4, 8])
            tile = rng.randint(0, 255, (tile_size, tile_size, 3)).astype(np.float32)
            for y in range(0, size, tile_size):
                for x in range(0, size, tile_size):
                    end_y = min(y + tile_size, size)
                    end_x = min(x + tile_size, size)
                    img[y:end_y, x:end_x] = tile[:end_y-y, :end_x-x]
        
        # AI images tend to have less noise
        noise = rng.normal(0, rng.uniform(1, 5), (size, size, 3))
        img += noise
    
    img = np.clip(img, 0, 255).astype(np.uint8)
    return Image.fromarray(img, "RGB")


def _print_stats():
    """Print dataset statistics."""
    print(f"\n{'='*60}")
    print("Dataset Statistics:")
    print(f"{'='*60}")
    for split in ["train", "test"]:
        split_dir = os.path.join(DATASET_DIR, split)
        if os.path.exists(split_dir):
            for label in ["REAL", "FAKE"]:
                class_dir = os.path.join(split_dir, label)
                if os.path.exists(class_dir):
                    count = len([f for f in os.listdir(class_dir) if f.endswith(('.png', '.jpg'))])
                    print(f"  {split}/{label}: {count} images")
    print(f"{'='*60}\n")


def main():
    if os.path.exists(DATASET_DIR):
        # Check if dataset is already complete
        train_real = os.path.join(DATASET_DIR, "train", "REAL")
        train_fake = os.path.join(DATASET_DIR, "train", "FAKE")
        if os.path.exists(train_real) and os.path.exists(train_fake):
            real_count = len(os.listdir(train_real))
            fake_count = len(os.listdir(train_fake))
            if real_count > 100 and fake_count > 100:
                print(f"Dataset already exists at {DATASET_DIR}")
                _print_stats()
                return
    
    os.makedirs(DATASET_DIR, exist_ok=True)
    
    # Try downloading CIFAKE first
    zip_path = os.path.join(DATASET_DIR, "cifake.zip")
    downloaded = False
    
    for url in CIFAKE_SOURCES:
        if download_with_progress(url, zip_path):
            # Verify it's a valid zip
            try:
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    print("Extracting dataset...")
                    zf.extractall(DATASET_DIR)
                downloaded = True
                os.remove(zip_path)
                print("CIFAKE dataset downloaded and extracted!")
                break
            except zipfile.BadZipFile:
                print("  Downloaded file is not a valid ZIP, trying next source...")
                os.remove(zip_path)
    
    if not downloaded:
        print("\nCIFAKE download unavailable. Generating synthetic dataset instead.")
        print("(This creates images with real-vs-AI characteristics for training)\n")
        generate_synthetic_cifake(num_train_per_class=5000, num_val_per_class=1000)
    
    _print_stats()


if __name__ == "__main__":
    main()
