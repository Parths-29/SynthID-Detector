"""
AI-Generated Image Classifier — Inference + Real Grad-CAM.

Supports two modes:
1. JIT model (aigi_classifier.pt)     → fast inference, probability only
2. State dict (aigi_classifier_state.pth) → Grad-CAM with activation hooks on layer4

If both exist, uses JIT for probability and state_dict for Grad-CAM.
If only JIT exists, returns probability without heatmap.
If neither exists, returns model_status='not_trained'.
"""

import os
import cv2
import numpy as np
import base64
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms, models
from PIL import Image
import io
import json

WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "weights")
JIT_PATH = os.path.join(WEIGHTS_DIR, "aigi_classifier.pt")
STATE_PATH = os.path.join(WEIGHTS_DIR, "aigi_classifier_state.pth")
LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "training_log.json")

# Standard ImageNet normalization since we use ResNet50
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])


class GradCAM:
    """
    Grad-CAM implementation for ResNet50 layer4.
    
    Registers forward and backward hooks on the target layer to capture
    feature maps and gradients, then computes gradient-weighted activation maps.
    """
    
    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        # Register hooks
        self._forward_hook = target_layer.register_forward_hook(self._save_activation)
        self._backward_hook = target_layer.register_full_backward_hook(self._save_gradient)
    
    def _save_activation(self, module, input, output):
        self.activations = output.detach()
    
    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()
    
    def generate(self, input_tensor: torch.Tensor, target_class: int) -> np.ndarray:
        """
        Generate Grad-CAM heatmap for the target class.
        
        Returns a (224, 224) float32 array normalized to [0, 1].
        """
        self.model.eval()
        
        # Forward pass (with gradients enabled)
        output = self.model(input_tensor)
        
        # Zero all gradients
        self.model.zero_grad()
        
        # Backward pass for the target class
        target_score = output[0, target_class]
        target_score.backward(retain_graph=False)
        
        if self.gradients is None or self.activations is None:
            # Hooks didn't fire — return empty heatmap
            return np.zeros((224, 224), dtype=np.float32)
        
        # Global average pooling of gradients → weights
        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)  # (1, C, 1, 1)
        
        # Weighted combination of activation maps
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)  # (1, 1, H, W)
        
        # ReLU (we only want positive contributions)
        cam = F.relu(cam)
        
        # Resize to input size
        cam = F.interpolate(cam, size=(224, 224), mode='bilinear', align_corners=False)
        
        # Normalize to [0, 1]
        cam = cam.squeeze().cpu().numpy()
        if cam.max() > 0:
            cam = cam / cam.max()
        
        return cam.astype(np.float32)
    
    def remove_hooks(self):
        self._forward_hook.remove()
        self._backward_hook.remove()


class ClassifierModel:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else
                                   "mps" if torch.backends.mps.is_available() else "cpu")
        self.jit_model = None
        self.gradcam_model = None
        self.gradcam = None
        self.is_trained = False
        self.fake_class_idx = 0  # Default: FAKE=0 (alphabetical in ImageFolder)
        
        self.ood_means = None
        self.ood_inv_covs = None
        self.ood_threshold = 2332.5775
        
        self._load_config()
        self._load_models()
    
    def _load_config(self):
        """Load the fake class index from training log."""
        if os.path.exists(LOG_PATH):
            try:
                with open(LOG_PATH) as f:
                    log = json.load(f)
                idx = log.get("config", {}).get("fake_class_index")
                if idx is not None:
                    self.fake_class_idx = idx
                    print(f"Loaded fake_class_idx={self.fake_class_idx} from training log")
            except Exception as e:
                print(f"Could not read training log: {e}")
    
    def _load_models(self):
        """Load JIT model for inference and raw model for Grad-CAM."""
        # Load JIT model (fast inference)
        if os.path.exists(JIT_PATH):
            try:
                self.jit_model = torch.jit.load(JIT_PATH, map_location=self.device)
                self.jit_model.eval()
                self.is_trained = True
                print(f"Loaded JIT classifier model from {JIT_PATH}")
            except Exception as e:
                print(f"Failed to load JIT model: {e}")
        
        # Load state dict model (for Grad-CAM with hooks)
        if os.path.exists(STATE_PATH):
            try:
                self.gradcam_model = models.resnet50(pretrained=False)
                self.gradcam_model.fc = nn.Linear(self.gradcam_model.fc.in_features, 2)
                state = torch.load(STATE_PATH, map_location=self.device)
                self.gradcam_model.load_state_dict(state)
                self.gradcam_model = self.gradcam_model.to(self.device)
                self.gradcam_model.eval()
                
                # Initialize Grad-CAM on layer4
                self.gradcam = GradCAM(self.gradcam_model, self.gradcam_model.layer4)
                self.is_trained = True
                print(f"Loaded Grad-CAM model from {STATE_PATH}")
            except Exception as e:
                print(f"Failed to load Grad-CAM model: {e}")
                self.gradcam_model = None
                self.gradcam = None
        
        if not self.is_trained:
            print("No trained classifier found. Running in dev-preview mode.")
            
        # Load OOD stats
        ood_stats_path = os.path.join(WEIGHTS_DIR, "ood_stats.npz")
        if os.path.exists(ood_stats_path):
            try:
                data = np.load(ood_stats_path)
                self.ood_means = data['means']
                covs = data['covs']
                self.ood_inv_covs = np.array([np.linalg.pinv(c, rcond=1e-5) for c in covs])
                print(f"Loaded OOD stats from {ood_stats_path}")
            except Exception as e:
                print(f"Failed to load OOD stats: {e}")
    
    def run_inference(self, image_bytes: bytes) -> dict:
        """
        Run classification inference on an image.
        
        Returns:
            - model_status: 'not_trained' | 'ready' | 'error'
            - probability: float (probability of being AI-generated)
            - heatmap: base64 PNG of Grad-CAM overlay (or None)
            - heatmap_text: human-readable description of activation region
        """
        if not self.is_trained:
            return {
                "model_status": "not_trained",
                "probability": None,
                "heatmap": None,
                "heatmap_text": None,
                "ood_status": None,
                "ood_distance": None,
            }
        
        try:
            # Load and preprocess image
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            input_tensor = preprocess(img).unsqueeze(0).to(self.device)
            
            # ── Get probability (from JIT model, fast) ──
            prob = self._get_probability(input_tensor)
            
            # ── Get OOD Status ──
            ood_distance, ood_status = self._compute_ood(input_tensor)
            
            # ── Generate real Grad-CAM heatmap (from state_dict model) ──
            heatmap_b64 = None
            heatmap_text = None
            
            if self.gradcam is not None:
                try:
                    # Need gradients for Grad-CAM
                    input_for_cam = input_tensor.clone().requires_grad_(True)
                    cam = self.gradcam.generate(input_for_cam, target_class=self.fake_class_idx)
                    
                    # Overlay on original image
                    np_img = np.array(img.resize((224, 224)))
                    heatmap_b64 = self._overlay_heatmap(np_img, cam)
                    heatmap_text = self._describe_activation(cam)
                except Exception as e:
                    print(f"Grad-CAM generation failed: {e}")
                    # Still return probability without heatmap
            
            return {
                "model_status": "ready",
                "probability": float(prob),
                "heatmap": f"data:image/png;base64,{heatmap_b64}" if heatmap_b64 else None,
                "heatmap_text": heatmap_text,
                "ood_status": ood_status,
                "ood_distance": float(ood_distance) if ood_distance is not None else None,
            }
            
        except Exception as e:
            print(f"Inference error: {e}")
            return {
                "model_status": "error",
                "probability": None,
                "heatmap": None,
                "heatmap_text": None,
                "ood_status": None,
                "ood_distance": None,
            }
    
    def _get_probability(self, input_tensor: torch.Tensor) -> float:
        """Get the probability of the image being AI-generated."""
        model = self.jit_model or self.gradcam_model
        
        with torch.no_grad():
            outputs = model(input_tensor)
            probs = F.softmax(outputs, dim=1)
            fake_prob = probs[0, self.fake_class_idx].item()
        
        return fake_prob
        
    def _compute_ood(self, input_tensor: torch.Tensor):
        """Compute OOD Mahalanobis distance and status."""
        if self.ood_means is None or self.ood_inv_covs is None or self.gradcam_model is None:
            return None, None
            
        # We need the 2048-dim features. For ResNet50, it's the output before FC.
        # We can extract it by passing through gradcam_model without the FC layer.
        with torch.no_grad():
            # gradcam_model is a ResNet50
            x = input_tensor
            x = self.gradcam_model.conv1(x)
            x = self.gradcam_model.bn1(x)
            x = self.gradcam_model.relu(x)
            x = self.gradcam_model.maxpool(x)
            
            x = self.gradcam_model.layer1(x)
            x = self.gradcam_model.layer2(x)
            x = self.gradcam_model.layer3(x)
            x = self.gradcam_model.layer4(x)
            
            x = self.gradcam_model.avgpool(x)
            feat = torch.flatten(x, 1)
            
            feat_np = feat[0].cpu().numpy().astype(np.float64)
            
        min_dist = float('inf')
        for c in range(len(self.ood_means)):
            diff = feat_np - self.ood_means[c]
            dist = diff.T @ self.ood_inv_covs[c] @ diff
            if dist < min_dist:
                min_dist = dist
                
        status = "in_distribution" if min_dist <= self.ood_threshold else "out_of_distribution"
        return min_dist, status
    
    def _overlay_heatmap(self, np_img: np.ndarray, cam: np.ndarray) -> str:
        """Create a JET-colored heatmap overlay and return base64 PNG."""
        # Apply JET colormap
        heatmap_colored = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Blend with original image
        overlay = cv2.addWeighted(np_img, 0.55, heatmap_colored, 0.45, 0)
        
        # Encode to base64
        overlay_bgr = cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode('.png', overlay_bgr)
        return base64.b64encode(buffer).decode('utf-8')
    
    def _describe_activation(self, cam: np.ndarray) -> str:
        """
        Convert Grad-CAM activation map to human-readable text.
        Divides the image into a 3x3 grid and identifies where the model focused.
        """
        h, w = cam.shape
        grid_h, grid_w = h // 3, w // 3
        
        regions = [
            ("top-left", 0, grid_h, 0, grid_w),
            ("top-center", 0, grid_h, grid_w, 2*grid_w),
            ("top-right", 0, grid_h, 2*grid_w, w),
            ("middle-left", grid_h, 2*grid_h, 0, grid_w),
            ("center", grid_h, 2*grid_h, grid_w, 2*grid_w),
            ("middle-right", grid_h, 2*grid_h, 2*grid_w, w),
            ("bottom-left", 2*grid_h, h, 0, grid_w),
            ("bottom-center", 2*grid_h, h, grid_w, 2*grid_w),
            ("bottom-right", 2*grid_h, h, 2*grid_w, w),
        ]
        
        # Compute mean activation for each region
        region_scores = []
        for name, r1, r2, c1, c2 in regions:
            mean_val = np.mean(cam[r1:r2, c1:c2])
            region_scores.append((name, float(mean_val)))
        
        # Sort by activation (highest first)
        region_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Build description
        primary = region_scores[0]
        secondary = region_scores[1] if len(region_scores) > 1 else None
        
        # Overall activation intensity
        total_activation = np.mean(cam)
        
        if total_activation < 0.1:
            intensity = "weak"
        elif total_activation < 0.3:
            intensity = "moderate"
        else:
            intensity = "strong"
        
        text = f"The model shows {intensity} neural activation, primarily focused on the {primary[0]} region"
        if secondary and secondary[1] > 0.1:
            text += f" with secondary attention on the {secondary[0]} region"
        text += "."
        
        return text


# Singleton instance (loaded at import time)
classifier_instance = ClassifierModel()
