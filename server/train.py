"""
Training pipeline for the emotion classification head.

Trains a small neural net to map text/image embeddings to our 42 emotion dimensions.

Data sources:
  1. GoEmotions dataset (58k Reddit comments, 27 labels → mapped to our 42 dims)
  2. Synthetic data from keyword-based seeds (for dimensions not in GoEmotions)

Usage:
  python train.py                      # Train from scratch
  python train.py --epochs 20          # Custom epoch count
  python train.py --resume             # Resume from existing checkpoint
  python train.py --add-synthetic 500  # Generate extra synthetic examples
"""

import os
import json
import logging
import argparse
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from sentence_transformers import SentenceTransformer
from datasets import load_dataset

from emotions import (
    EMOTIONS, NUM_EMOTIONS, EMOTION_INDEX,
    GOEMOTIONS_MAP, SYNTHETIC_SEEDS, goemotions_to_42,
)
from app import EmotionHead

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = Path(os.environ.get("MODEL_DIR", "./models"))
MODEL_DIR.mkdir(exist_ok=True)
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class EmotionDataset(Dataset):
    """Dataset of (embedding, emotion_vector) pairs."""

    def __init__(self, embeddings: np.ndarray, labels: np.ndarray):
        self.embeddings = torch.FloatTensor(embeddings)
        self.labels = torch.FloatTensor(labels)

    def __len__(self):
        return len(self.embeddings)

    def __getitem__(self, idx):
        return self.embeddings[idx], self.labels[idx]


def load_goemotions_data(text_model, max_samples=None):
    """
    Load GoEmotions dataset, compute text embeddings, and convert labels
    to our 42-dimension space.
    """
    logger.info("Loading GoEmotions dataset...")
    dataset = load_dataset("google-research-datasets/go_emotions", "simplified")
    train_data = dataset["train"]

    texts = []
    labels_42 = []

    # GoEmotions label names (from the dataset)
    ge_label_names = [
        "admiration", "amusement", "anger", "annoyance", "approval", "caring",
        "confusion", "curiosity", "desire", "disappointment", "disapproval",
        "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
        "joy", "love", "nervousness", "optimism", "pride", "realization",
        "relief", "remorse", "sadness", "surprise", "neutral",
    ]

    for i, example in enumerate(train_data):
        if max_samples and i >= max_samples:
            break

        text = example["text"]
        label_ids = example["labels"]

        # Convert label IDs to GoEmotions scores
        ge_scores = {}
        for lid in label_ids:
            if lid < len(ge_label_names):
                label_name = ge_label_names[lid]
                if label_name != "neutral":
                    ge_scores[label_name] = 1.0

        # Skip neutral-only examples
        if not ge_scores:
            continue

        # Map to our 42 dimensions
        emotion_vec = goemotions_to_42(ge_scores)

        texts.append(text)
        labels_42.append(emotion_vec)

    logger.info(f"Loaded {len(texts)} GoEmotions examples")

    # Compute embeddings in batches
    logger.info("Computing text embeddings...")
    embeddings = text_model.encode(
        texts,
        batch_size=256,
        show_progress_bar=True,
        convert_to_numpy=True,
    )

    return np.array(embeddings), np.array(labels_42)


def generate_synthetic_data(text_model, num_per_dim=50):
    """
    Generate synthetic training data for dimensions not well-covered by GoEmotions.
    Uses the keyword seeds to find/generate text snippets and assign labels.
    """
    logger.info("Generating synthetic training data...")

    texts = []
    labels = []

    # For each dimension with seeds, create examples
    for dim_name, keywords in SYNTHETIC_SEEDS.items():
        dim_idx = EMOTION_INDEX[dim_name]

        for kw in keywords:
            # Create simple template texts
            templates = [
                f"I feel a deep sense of {kw}",
                f"There's something about {kw} that moves me",
                f"This reminds me of {kw}",
                f"The {kw} is overwhelming",
                f"{kw.capitalize()} fills the room",
            ]

            for template in templates[:num_per_dim // len(keywords) + 1]:
                label_vec = [0.0] * NUM_EMOTIONS
                label_vec[dim_idx] = 0.8  # Strong signal on this dimension

                # Add some cross-pollination based on related dimensions
                # (e.g., longing often comes with melancholy and warmth)
                if dim_name in ("longing", "nostalgia"):
                    if "melancholy" in EMOTION_INDEX:
                        label_vec[EMOTION_INDEX["melancholy"]] = 0.3
                    if "warmth" in EMOTION_INDEX:
                        label_vec[EMOTION_INDEX["warmth"]] = 0.2
                elif dim_name in ("love", "devotion", "intimacy"):
                    if "warmth" in EMOTION_INDEX:
                        label_vec[EMOTION_INDEX["warmth"]] = 0.4
                    if "connection" in EMOTION_INDEX:
                        label_vec[EMOTION_INDEX["connection"]] = 0.3
                elif dim_name in ("grief", "isolation"):
                    if "sadness" in EMOTION_INDEX:
                        label_vec[EMOTION_INDEX["sadness"]] = 0.3
                    if "fragility" in EMOTION_INDEX:
                        label_vec[EMOTION_INDEX["fragility"]] = 0.2

                texts.append(template)
                labels.append(label_vec)

    logger.info(f"Generated {len(texts)} synthetic examples")

    embeddings = text_model.encode(
        texts,
        batch_size=256,
        show_progress_bar=True,
        convert_to_numpy=True,
    )

    return np.array(embeddings), np.array(labels)


def train(
    epochs: int = 10,
    batch_size: int = 64,
    lr: float = 1e-3,
    max_samples: int = None,
    resume: bool = False,
    extra_synthetic: int = 50,
):
    """Train the emotion head."""

    # Load text model
    logger.info(f"Loading text model on {DEVICE}...")
    text_model = SentenceTransformer("all-MiniLM-L6-v2", device=DEVICE)

    # Load data
    ge_embeddings, ge_labels = load_goemotions_data(text_model, max_samples)
    syn_embeddings, syn_labels = generate_synthetic_data(text_model, extra_synthetic)

    # Combine datasets
    all_embeddings = np.concatenate([ge_embeddings, syn_embeddings], axis=0)
    all_labels = np.concatenate([ge_labels, syn_labels], axis=0)

    logger.info(f"Total training data: {len(all_embeddings)} examples")

    # Create dataset and split
    dataset = EmotionDataset(all_embeddings, all_labels)
    train_size = int(0.9 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)

    # Create model
    emotion_head = EmotionHead(text_dim=all_embeddings.shape[1]).to(DEVICE)

    if resume and (MODEL_DIR / "emotion_head.pt").exists():
        logger.info("Resuming from checkpoint...")
        emotion_head.load_state_dict(
            torch.load(MODEL_DIR / "emotion_head.pt", map_location=DEVICE)
        )

    optimizer = optim.Adam(emotion_head.parameters(), lr=lr)
    # Use BCE loss since each dimension is independent (multi-label)
    criterion = nn.BCELoss()

    # Training loop
    best_val_loss = float("inf")

    for epoch in range(epochs):
        # Train
        emotion_head.train()
        train_loss = 0
        for embeddings, labels in train_loader:
            embeddings, labels = embeddings.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            predictions = emotion_head.forward_text(embeddings)
            loss = criterion(predictions, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validate
        emotion_head.eval()
        val_loss = 0
        with torch.no_grad():
            for embeddings, labels in val_loader:
                embeddings, labels = embeddings.to(DEVICE), labels.to(DEVICE)
                predictions = emotion_head.forward_text(embeddings)
                loss = criterion(predictions, labels)
                val_loss += loss.item()

        val_loss /= len(val_loader)

        logger.info(
            f"Epoch {epoch+1}/{epochs} — "
            f"Train loss: {train_loss:.4f}, Val loss: {val_loss:.4f}"
        )

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(emotion_head.state_dict(), MODEL_DIR / "emotion_head.pt")
            logger.info(f"  Saved best model (val_loss={val_loss:.4f})")

    # Save training metadata
    meta = {
        "epochs": epochs,
        "best_val_loss": best_val_loss,
        "train_samples": train_size,
        "val_samples": val_size,
        "embedding_dim": int(all_embeddings.shape[1]),
        "num_emotions": NUM_EMOTIONS,
        "emotion_names": EMOTIONS,
    }
    with open(MODEL_DIR / "training_meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    logger.info(f"Training complete. Best val loss: {best_val_loss:.4f}")
    logger.info(f"Model saved to {MODEL_DIR / 'emotion_head.pt'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train emotion classification head")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--max-samples", type=int, default=None)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--add-synthetic", type=int, default=50)
    args = parser.parse_args()

    train(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        max_samples=args.max_samples,
        resume=args.resume,
        extra_synthetic=args.add_synthetic,
    )
