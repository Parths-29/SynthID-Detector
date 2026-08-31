"""
Train an AI-Generated Image Classifier (ResNet50 fine-tune).

Architecture:
    - Backbone: ResNet50 (ImageNet pretrained)
    - Frozen: all layers except layer4 + fc
    - Head: Linear(2048 → 2)  [Real vs Fake]
    - Grad-CAM target: layer4 (last conv block)

Saves:
    - ml/weights/aigi_classifier.pt       (JIT traced, for fast production inference)
    - ml/weights/aigi_classifier_state.pth (state_dict, for Grad-CAM with hooks)
    - ml/training_log.json                 (epoch-by-epoch metrics)

Usage:
    cd synthid-detector
    source venv/bin/activate
    python -m ml.download_dataset   # first time only
    python -m ml.train_classifier
"""

import os
import sys
import json
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, random_split

# ── Config ──
BATCH_SIZE = 64
EPOCHS = 15
PATIENCE = 4  # early stopping patience
LR_LAYER4 = 1e-4
LR_FC = 1e-3
DATA_DIR = os.path.join(os.path.dirname(__file__), "cifake_dataset")
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")
JIT_PATH = os.path.join(WEIGHTS_DIR, "aigi_classifier.pt")
STATE_PATH = os.path.join(WEIGHTS_DIR, "aigi_classifier_state.pth")
LOG_PATH = os.path.join(os.path.dirname(__file__), "training_log.json")


def build_model(device):
    """Build ResNet50 with frozen backbone except layer4 + new FC head."""
    model = models.resnet50(pretrained=True)
    
    # Freeze everything
    for param in model.parameters():
        param.requires_grad = False
    
    # Unfreeze layer4
    for param in model.layer4.parameters():
        param.requires_grad = True
    
    # New binary classification head
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2)
    
    return model.to(device)


def get_dataloaders():
    """Load train and validation datasets."""
    transform_train = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    
    transform_val = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    
    train_dir = os.path.join(DATA_DIR, "train")
    test_dir = os.path.join(DATA_DIR, "test")
    
    if not os.path.exists(train_dir):
        print(f"ERROR: Dataset not found at {train_dir}")
        print("Run: python -m ml.download_dataset")
        sys.exit(1)
    
    train_dataset = datasets.ImageFolder(root=train_dir, transform=transform_train)
    
    # Check class mapping
    print(f"\nClass mapping: {train_dataset.class_to_idx}")
    # FAKE=0, REAL=1 in alphabetical order
    # We want: probability of FAKE = model output for class 0
    fake_idx = train_dataset.class_to_idx.get("FAKE", None)
    real_idx = train_dataset.class_to_idx.get("REAL", None)
    print(f"  FAKE index: {fake_idx}")
    print(f"  REAL index: {real_idx}")
    
    if fake_idx is None or real_idx is None:
        # Try lowercase
        fake_idx = train_dataset.class_to_idx.get("fake", train_dataset.class_to_idx.get("FAKE", 0))
        real_idx = train_dataset.class_to_idx.get("real", train_dataset.class_to_idx.get("REAL", 1))
        print(f"  Adjusted — FAKE index: {fake_idx}, REAL index: {real_idx}")
    
    # Use test dir as validation if it exists, otherwise split train
    if os.path.exists(test_dir) and len(os.listdir(test_dir)) > 0:
        val_dataset = datasets.ImageFolder(root=test_dir, transform=transform_val)
        print(f"Using separate test dir for validation: {len(val_dataset)} images")
    else:
        # 80/20 split
        val_size = int(0.2 * len(train_dataset))
        train_size = len(train_dataset) - val_size
        train_dataset, val_dataset = random_split(train_dataset, [train_size, val_size])
        print(f"Split train into {train_size} train + {val_size} val")
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, 
                              num_workers=0, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, 
                            num_workers=0, pin_memory=True)
    
    print(f"Train batches: {len(train_loader)}, Val batches: {len(val_loader)}")
    
    return train_loader, val_loader, fake_idx


def train_one_epoch(model, loader, criterion, optimizer, device):
    """Train for one epoch, return avg loss and accuracy."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for inputs, labels in loader:
        inputs, labels = inputs.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
    
    return running_loss / total, correct / total


def validate(model, loader, criterion, device):
    """Validate, return avg loss and accuracy."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for inputs, labels in loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
    
    return running_loss / total, correct / total


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else 
                          "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"\n{'='*60}")
    print(f"Training AI-Generated Image Classifier")
    print(f"Device: {device}")
    print(f"{'='*60}\n")
    
    # Build model
    model = build_model(device)
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"Parameters: {total:,} total, {trainable:,} trainable ({100*trainable/total:.1f}%)")
    
    # Data
    train_loader, val_loader, fake_idx = get_dataloaders()
    
    # Training setup
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam([
        {'params': model.layer4.parameters(), 'lr': LR_LAYER4},
        {'params': model.fc.parameters(), 'lr': LR_FC}
    ])
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', 
                                                      factor=0.5, patience=2)
    
    # Training loop
    training_log = {
        "config": {
            "backbone": "resnet50",
            "frozen_layers": "conv1, bn1, layer1, layer2, layer3",
            "unfrozen_layers": "layer4, fc",
            "batch_size": BATCH_SIZE,
            "epochs_max": EPOCHS,
            "lr_layer4": LR_LAYER4,
            "lr_fc": LR_FC,
            "patience": PATIENCE,
            "device": str(device),
            "fake_class_index": fake_idx,
        },
        "epochs": []
    }
    
    best_val_acc = 0.0
    best_epoch = 0
    patience_counter = 0
    start_time = time.time()
    
    print(f"\n{'─'*60}")
    print(f"{'Epoch':>6} │ {'Train Loss':>10} │ {'Train Acc':>9} │ {'Val Loss':>10} │ {'Val Acc':>9}")
    print(f"{'─'*60}")
    
    for epoch in range(1, EPOCHS + 1):
        epoch_start = time.time()
        
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        
        scheduler.step(val_loss)
        
        epoch_time = time.time() - epoch_start
        
        # Log
        epoch_data = {
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_loss": round(val_loss, 4),
            "val_acc": round(val_acc, 4),
            "time_seconds": round(epoch_time, 1),
            "lr": optimizer.param_groups[0]['lr']
        }
        training_log["epochs"].append(epoch_data)
        
        marker = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_epoch = epoch
            patience_counter = 0
            marker = " ★ best"
            
            # Save best model (both formats)
            os.makedirs(WEIGHTS_DIR, exist_ok=True)
            
            # State dict for Grad-CAM
            torch.save(model.state_dict(), STATE_PATH)
            
            # JIT traced for production inference
            model.eval()
            example = torch.rand(1, 3, 224, 224).to(device)
            traced = torch.jit.trace(model, example)
            traced.save(JIT_PATH)
            model.train()
        else:
            patience_counter += 1
        
        print(f"{epoch:>6} │ {train_loss:>10.4f} │ {train_acc:>8.1%} │ {val_loss:>10.4f} │ {val_acc:>8.1%}{marker}")
        
        if patience_counter >= PATIENCE:
            print(f"\nEarly stopping at epoch {epoch} (no improvement for {PATIENCE} epochs)")
            break
    
    total_time = time.time() - start_time
    
    # Final summary
    training_log["summary"] = {
        "best_epoch": best_epoch,
        "best_val_acc": round(best_val_acc, 4),
        "total_epochs_run": len(training_log["epochs"]),
        "total_time_seconds": round(total_time, 1),
        "total_time_minutes": round(total_time / 60, 1),
        "jit_model_path": JIT_PATH,
        "state_dict_path": STATE_PATH,
    }
    
    # Save training log
    with open(LOG_PATH, "w") as f:
        json.dump(training_log, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"Training Complete!")
    print(f"{'='*60}")
    print(f"  Best epoch:     {best_epoch}")
    print(f"  Best val acc:   {best_val_acc:.1%}")
    print(f"  Total time:     {total_time/60:.1f} minutes")
    print(f"  JIT model:      {JIT_PATH}")
    print(f"  State dict:     {STATE_PATH}")
    print(f"  Training log:   {LOG_PATH}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
