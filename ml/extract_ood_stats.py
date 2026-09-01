import os
import torch
import torch.nn as nn
from torchvision import models, datasets, transforms
from torch.utils.data import DataLoader
import numpy as np

BATCH_SIZE = 64
DATA_DIR = os.path.join(os.path.dirname(__file__), "cifake_dataset")
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")
STATE_PATH = os.path.join(WEIGHTS_DIR, "aigi_classifier_state.pth")
OOD_STATS_PATH = os.path.join(WEIGHTS_DIR, "ood_stats.npz")

def get_dataloaders():
    # Use standard validation transforms for feature extraction to get stable representations
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    
    train_dir = os.path.join(DATA_DIR, "train")
    train_dataset = datasets.ImageFolder(root=train_dir, transform=transform)
    
    test_dir = os.path.join(DATA_DIR, "test")
    val_dataset = datasets.ImageFolder(root=test_dir, transform=transform)
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    
    return train_loader, val_loader, train_dataset.class_to_idx

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else 
                          "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Load Model
    model = models.resnet50(pretrained=False)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2)
    
    # Load state dict
    if not os.path.exists(STATE_PATH):
        print(f"Error: Could not find model state at {STATE_PATH}")
        return
        
    model.load_state_dict(torch.load(STATE_PATH, map_location=device))
    
    # We want features before FC layer. ResNet50 has `avgpool` before `fc`.
    # Let's replace `fc` with Identity to just get the 2048-dim features.
    model.fc = nn.Identity()
    model.to(device)
    model.eval()
    
    train_loader, val_loader, class_to_idx = get_dataloaders()
    print(f"Class mapping: {class_to_idx}")
    
    num_classes = len(class_to_idx)
    feature_dim = 2048
    
    print("Extracting features for training set...")
    features_all = []
    labels_all = []
    
    with torch.no_grad():
        for i, (inputs, labels) in enumerate(train_loader):
            inputs = inputs.to(device)
            feats = model(inputs)
            # Reshape if necessary
            feats = feats.view(feats.size(0), -1)
            features_all.append(feats.cpu().numpy().astype(np.float64))
            labels_all.append(labels.numpy())
            if i % 10 == 0 or i == len(train_loader) - 1:
                print(f"  Batch {i}/{len(train_loader)}")
                
    features_all = np.concatenate(features_all, axis=0)
    labels_all = np.concatenate(labels_all, axis=0)
    
    print(f"Extracted features shape: {features_all.shape}")
    
    class_means = []
    class_covs = []
    
    # Compute mean and covariance for each class
    for c in range(num_classes):
        class_feats = features_all[labels_all == c]
        mean = np.mean(class_feats, axis=0)
        # Covariance matrix: rowvar=False means columns are variables
        cov = np.cov(class_feats, rowvar=False)
        # Add small ridge to diagonal for numerical stability (invertibility)
        cov += np.eye(feature_dim) * 1e-4
        
        class_means.append(mean)
        class_covs.append(cov)
        
    class_means = np.array(class_means)
    class_covs = np.array(class_covs)
    
    np.savez(OOD_STATS_PATH, means=class_means, covs=class_covs, classes=class_to_idx)
    print(f"Saved OOD stats to {OOD_STATS_PATH}")
    
    print("Calibrating threshold on validation set...")
    val_distances = []
    
    inv_covs = np.array([np.linalg.pinv(cov, rcond=1e-5) for cov in class_covs])
    
    with torch.no_grad():
        for i, (inputs, labels) in enumerate(val_loader):
            inputs = inputs.to(device)
            feats = model(inputs)
            feats = feats.view(feats.size(0), -1).cpu().numpy().astype(np.float64)
            
            for feat in feats:
                min_dist = float('inf')
                for c in range(num_classes):
                    diff = feat - class_means[c]
                    # Mahalanobis distance squared
                    dist = diff.T @ inv_covs[c] @ diff
                    if dist < min_dist:
                        min_dist = dist
                val_distances.append(min_dist)
                
    val_distances = np.array(val_distances)
    # The user asks for 95th percentile of in-distribution validation data
    threshold = np.percentile(val_distances, 95)
    print(f"95th Percentile Mahalanobis Distance on Val Set: {threshold:.4f}")
    
if __name__ == "__main__":
    main()
