import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader

# ── Config ──
BATCH_SIZE = 64
EPOCHS = 5
# CIFAKE dataset structure should be:
# dataset/train/REAL
# dataset/train/FAKE
DATA_DIR = "./cifake_dataset/train"
OUTPUT_PATH = "./weights/aigi_classifier.pt"

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # 1. Prepare Data
    # Images resized to 224x224 for ResNet50
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    if not os.path.exists(DATA_DIR):
        print(f"Dataset not found at {DATA_DIR}. Please download CIFAKE.")
        return

    dataset = datasets.ImageFolder(root=DATA_DIR, transform=transform)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)

    # 2. Setup ResNet50 Backbone
    model = models.resnet50(pretrained=True)
    
    # Freeze all layers first
    for param in model.parameters():
        param.requires_grad = False
        
    # Unfreeze layer4 (the last conv block)
    for param in model.layer4.parameters():
        param.requires_grad = True

    # Replace the FC layer for binary classification (Real vs Fake)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2)
    
    model = model.to(device)

    # 3. Training Loop
    criterion = nn.CrossEntropyLoss()
    # Only optimize layer4 and fc
    optimizer = optim.Adam([
        {'params': model.layer4.parameters(), 'lr': 1e-4},
        {'params': model.fc.parameters(), 'lr': 1e-3}
    ])

    model.train()
    for epoch in range(EPOCHS):
        running_loss = 0.0
        for i, (inputs, labels) in enumerate(dataloader):
            inputs, labels = inputs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            if i % 10 == 9:
                print(f"[Epoch {epoch+1}, Batch {i+1}] loss: {running_loss / 10:.3f}")
                running_loss = 0.0

    print("Training finished.")

    # 4. Export to torch.jit.script
    model.eval()
    # We must use torch.jit.script or trace to export
    # Tracing is often easier for ResNet
    example_input = torch.rand(1, 3, 224, 224).to(device)
    traced_model = torch.jit.trace(model, example_input)
    
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    traced_model.save(OUTPUT_PATH)
    print(f"Model exported to {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
