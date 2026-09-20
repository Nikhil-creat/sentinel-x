"""Optional small CNN (PyTorch) for 32x32 byte-plot images. Used when model.pt exists."""
import torch
from torch import nn


class SmallCNN(nn.Module):
    def __init__(self, classes=4):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),   # 16x16
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),  # 8x8
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.AdaptiveAvgPool2d(1),
            nn.Flatten(), nn.Dropout(0.2), nn.Linear(64, classes),
        )

    def forward(self, x):
        return self.net(x)
