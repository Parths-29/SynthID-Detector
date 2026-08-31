"""
Evaluate the trained AI-Generated Image Classifier.

Generates:
    - ml/evaluation_report/confusion_matrix.png
    - ml/evaluation_report/roc_curve.png
    - ml/evaluation_report/classification_report.txt
    - ml/evaluation_report/metrics.json

Usage:
    cd synthid-detector
    source venv/bin/activate
    python -m ml.evaluate
"""

import os
import sys
import json
import torch
import torch.nn.functional as F
import numpy as np
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_curve,
    auc,
    accuracy_score,
    precision_recall_fscore_support
)

try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    import seaborn as sns
except ImportError:
    print("Please install: pip install matplotlib seaborn")
    sys.exit(1)


WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")
STATE_PATH = os.path.join(WEIGHTS_DIR, "aigi_classifier_state.pth")
JIT_PATH = os.path.join(WEIGHTS_DIR, "aigi_classifier.pt")
DATA_DIR = os.path.join(os.path.dirname(__file__), "cifake_dataset")
REPORT_DIR = os.path.join(os.path.dirname(__file__), "evaluation_report")
LOG_PATH = os.path.join(os.path.dirname(__file__), "training_log.json")

BATCH_SIZE = 64


def load_model(device):
    """Load the trained model for evaluation."""
    # Try JIT model first (faster)
    if os.path.exists(JIT_PATH):
        print(f"Loading JIT model from {JIT_PATH}")
        model = torch.jit.load(JIT_PATH, map_location=device)
        model.eval()
        return model, "jit"
    
    # Fall back to state dict
    if os.path.exists(STATE_PATH):
        print(f"Loading state dict from {STATE_PATH}")
        model = models.resnet50(pretrained=False)
        model.fc = torch.nn.Linear(model.fc.in_features, 2)
        model.load_state_dict(torch.load(STATE_PATH, map_location=device))
        model = model.to(device)
        model.eval()
        return model, "state_dict"
    
    print("ERROR: No trained model found!")
    print(f"  Checked: {JIT_PATH}")
    print(f"  Checked: {STATE_PATH}")
    print("Run: python -m ml.train_classifier")
    sys.exit(1)


def get_val_loader():
    """Load validation/test dataset."""
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    
    test_dir = os.path.join(DATA_DIR, "test")
    if not os.path.exists(test_dir):
        print(f"ERROR: Test dataset not found at {test_dir}")
        sys.exit(1)
    
    dataset = datasets.ImageFolder(root=test_dir, transform=transform)
    print(f"Test dataset: {len(dataset)} images")
    print(f"Class mapping: {dataset.class_to_idx}")
    
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    return loader, dataset.class_to_idx


def evaluate(model, loader, device):
    """Run evaluation and collect predictions."""
    all_labels = []
    all_preds = []
    all_probs = []
    
    with torch.no_grad():
        for inputs, labels in loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            probs = F.softmax(outputs, dim=1)
            _, preds = outputs.max(1)
            
            all_labels.extend(labels.numpy())
            all_preds.extend(preds.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())
    
    return np.array(all_labels), np.array(all_preds), np.array(all_probs)


def plot_confusion_matrix(labels, preds, class_names, save_path):
    """Generate and save confusion matrix plot."""
    cm = confusion_matrix(labels, preds)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_names, yticklabels=class_names,
                ax=ax, annot_kws={"size": 16})
    ax.set_xlabel('Predicted', fontsize=14)
    ax.set_ylabel('Actual', fontsize=14)
    ax.set_title('Confusion Matrix — AI Image Classifier', fontsize=16, fontweight='bold')
    
    # Add accuracy text
    acc = accuracy_score(labels, preds)
    fig.text(0.5, 0.01, f'Overall Accuracy: {acc:.1%}', ha='center', fontsize=12, 
             style='italic', color='gray')
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  Confusion matrix saved: {save_path}")


def plot_roc_curve(labels, probs, fake_idx, save_path):
    """Generate and save ROC curve plot."""
    # Binary labels: 1 = fake, 0 = real
    binary_labels = (labels == fake_idx).astype(int)
    fake_probs = probs[:, fake_idx]
    
    fpr, tpr, thresholds = roc_curve(binary_labels, fake_probs)
    roc_auc = auc(fpr, tpr)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(fpr, tpr, color='#6366f1', lw=2.5, label=f'ROC Curve (AUC = {roc_auc:.3f})')
    ax.plot([0, 1], [0, 1], color='gray', lw=1, linestyle='--', alpha=0.5)
    ax.fill_between(fpr, tpr, alpha=0.1, color='#6366f1')
    
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel('False Positive Rate', fontsize=14)
    ax.set_ylabel('True Positive Rate', fontsize=14)
    ax.set_title('ROC Curve — AI Image Classifier', fontsize=16, fontweight='bold')
    ax.legend(loc='lower right', fontsize=12)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  ROC curve saved: {save_path}")
    
    return roc_auc


def plot_training_curves(log_path, save_path):
    """Plot training loss/accuracy curves from training_log.json."""
    if not os.path.exists(log_path):
        print("  No training log found, skipping training curves.")
        return
    
    with open(log_path) as f:
        log = json.load(f)
    
    epochs_data = log.get("epochs", [])
    if not epochs_data:
        return
    
    epochs = [e["epoch"] for e in epochs_data]
    train_loss = [e["train_loss"] for e in epochs_data]
    val_loss = [e["val_loss"] for e in epochs_data]
    train_acc = [e["train_acc"] * 100 for e in epochs_data]
    val_acc = [e["val_acc"] * 100 for e in epochs_data]
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss
    ax1.plot(epochs, train_loss, 'o-', color='#6366f1', label='Train Loss', lw=2)
    ax1.plot(epochs, val_loss, 's-', color='#f43f5e', label='Val Loss', lw=2)
    ax1.set_xlabel('Epoch', fontsize=12)
    ax1.set_ylabel('Loss', fontsize=12)
    ax1.set_title('Training & Validation Loss', fontsize=14, fontweight='bold')
    ax1.legend(fontsize=11)
    ax1.grid(True, alpha=0.3)
    
    # Accuracy
    ax2.plot(epochs, train_acc, 'o-', color='#6366f1', label='Train Acc', lw=2)
    ax2.plot(epochs, val_acc, 's-', color='#10b981', label='Val Acc', lw=2)
    ax2.set_xlabel('Epoch', fontsize=12)
    ax2.set_ylabel('Accuracy (%)', fontsize=12)
    ax2.set_title('Training & Validation Accuracy', fontsize=14, fontweight='bold')
    ax2.legend(fontsize=11)
    ax2.grid(True, alpha=0.3)
    
    plt.suptitle('AI Image Classifier — Training Progress', fontsize=16, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"  Training curves saved: {save_path}")


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else 
                          "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"\n{'='*60}")
    print(f"Evaluating AI-Generated Image Classifier")
    print(f"Device: {device}")
    print(f"{'='*60}\n")
    
    # Load model
    model, model_type = load_model(device)
    
    # Load data
    loader, class_to_idx = get_val_loader()
    class_names = sorted(class_to_idx, key=class_to_idx.get)  # e.g., ['FAKE', 'REAL']
    fake_idx = class_to_idx.get("FAKE", class_to_idx.get("fake", 0))
    
    # Evaluate
    print("\nRunning evaluation...")
    labels, preds, probs = evaluate(model, loader, device)
    
    # Metrics
    acc = accuracy_score(labels, preds)
    precision, recall, f1, support = precision_recall_fscore_support(labels, preds, average=None)
    report = classification_report(labels, preds, target_names=class_names)
    
    print(f"\n{report}")
    
    # Save reports
    os.makedirs(REPORT_DIR, exist_ok=True)
    
    print("Generating reports...")
    
    # 1. Classification report text
    report_path = os.path.join(REPORT_DIR, "classification_report.txt")
    with open(report_path, "w") as f:
        f.write(f"AI-Generated Image Classifier — Evaluation Report\n")
        f.write(f"{'='*50}\n\n")
        f.write(f"Model type: {model_type}\n")
        f.write(f"Device: {device}\n")
        f.write(f"Test samples: {len(labels)}\n")
        f.write(f"Class mapping: {class_to_idx}\n\n")
        f.write(report)
    print(f"  Classification report saved: {report_path}")
    
    # 2. Confusion matrix
    cm_path = os.path.join(REPORT_DIR, "confusion_matrix.png")
    plot_confusion_matrix(labels, preds, class_names, cm_path)
    
    # 3. ROC curve
    roc_path = os.path.join(REPORT_DIR, "roc_curve.png")
    roc_auc = plot_roc_curve(labels, probs, fake_idx, roc_path)
    
    # 4. Training curves (if available)
    curves_path = os.path.join(REPORT_DIR, "training_curves.png")
    plot_training_curves(LOG_PATH, curves_path)
    
    # 5. JSON metrics
    metrics = {
        "accuracy": round(acc, 4),
        "roc_auc": round(roc_auc, 4),
        "per_class": {},
        "test_samples": int(len(labels)),
        "class_mapping": class_to_idx,
    }
    for i, name in enumerate(class_names):
        metrics["per_class"][name] = {
            "precision": round(float(precision[i]), 4),
            "recall": round(float(recall[i]), 4),
            "f1_score": round(float(f1[i]), 4),
            "support": int(support[i]),
        }
    
    metrics_path = os.path.join(REPORT_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  Metrics JSON saved: {metrics_path}")
    
    print(f"\n{'='*60}")
    print(f"Evaluation Complete!")
    print(f"{'='*60}")
    print(f"  Accuracy:  {acc:.1%}")
    print(f"  ROC AUC:   {roc_auc:.3f}")
    for name in class_names:
        m = metrics["per_class"][name]
        print(f"  {name:>6}: P={m['precision']:.3f}  R={m['recall']:.3f}  F1={m['f1_score']:.3f}")
    print(f"\n  Reports at: {REPORT_DIR}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
