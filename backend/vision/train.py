"""Train the optional CNN on synthetic byte-plot data, then save model.pt.

    pip install torch numpy
    python train.py

For a real project, replace make_dataset() with a public malware image dataset
(for example Malimg) resized to 32x32 grayscale, keeping the same 4 or more classes.
"""
import numpy as np
import torch
from torch import nn

from cnn import SmallCNN
from logic import KINDS, gen_sample


def make_dataset(per_class=600, seed0=10_000):
    xs, ys = [], []
    for label, kind in enumerate(KINDS):
        for i in range(per_class):
            xs.append(gen_sample(kind, seed0 + label * per_class + i).reshape(1, 32, 32))
            ys.append(label)
    x = torch.tensor(np.array(xs), dtype=torch.float32) / 255.0
    y = torch.tensor(ys, dtype=torch.long)
    perm = torch.randperm(len(y))
    return x[perm], y[perm]


def main(epochs=8):
    torch.manual_seed(0)
    x, y = make_dataset()
    split = int(0.8 * len(y))
    xtr, ytr, xva, yva = x[:split], y[:split], x[split:], y[split:]
    model = SmallCNN(len(KINDS))
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()
    for epoch in range(epochs):
        model.train()
        order = torch.randperm(len(ytr))
        for i in range(0, len(order), 64):
            idx = order[i : i + 64]
            opt.zero_grad()
            loss = loss_fn(model(xtr[idx]), ytr[idx])
            loss.backward()
            opt.step()
        model.eval()
        with torch.no_grad():
            acc = (model(xva).argmax(1) == yva).float().mean().item()
        print(f"epoch {epoch + 1}/{epochs}  validation accuracy {acc:.3f}")
    torch.save(model.state_dict(), "model.pt")
    print("saved model.pt")


if __name__ == "__main__":
    main()
