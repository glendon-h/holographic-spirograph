"""
Emotion Encoding Server for the Holographic Spirograph.

FastAPI service that takes text or images and returns a 42-dimension
emotion vector. Uses sentence-transformers for text and CLIP for images,
with a trained classification head that maps embeddings to our emotion taxonomy.

API:
  POST /encode     - encode text or image to emotion vector
  GET  /health     - check server status
  GET  /emotions   - list all 42 emotion dimension names
  POST /fine-tune  - add user-labeled examples for fine-tuning (future)
"""

import os
import io
import json
import logging
import base64
from pathlib import Path
from contextlib import asynccontextmanager

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from transformers import CLIPProcessor, CLIPModel

from emotions import EMOTIONS, NUM_EMOTIONS, goemotions_to_42

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration ---
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/models"))
TEXT_MODEL_NAME = os.environ.get("TEXT_MODEL", "all-MiniLM-L6-v2")
CLIP_MODEL_NAME = os.environ.get("CLIP_MODEL", "openai/clip-vit-base-patch32")
EMOTION_HEAD_PATH = MODEL_DIR / "emotion_head.pt"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# --- Emotion classification head ---
class EmotionHead(nn.Module):
    """
    Small neural net that maps from embedding space to 42 emotion dimensions.
    Accepts both text embeddings (384-dim from MiniLM) and image embeddings
    (512-dim from CLIP) via a shared hidden layer.
    """
    def __init__(self, text_dim=384, image_dim=512, hidden_dim=256):
        super().__init__()
        self.text_proj = nn.Linear(text_dim, hidden_dim)
        self.image_proj = nn.Linear(image_dim, hidden_dim)
        self.shared = nn.Sequential(
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim, NUM_EMOTIONS),
            nn.Sigmoid(),  # Output is 0-1 per emotion
        )

    def forward_text(self, text_embedding):
        h = self.text_proj(text_embedding)
        return self.shared(h)

    def forward_image(self, image_embedding):
        h = self.image_proj(image_embedding)
        return self.shared(h)


# --- Global model state ---
text_model = None
clip_model = None
clip_processor = None
emotion_head = None


def load_models():
    """Load all models at startup."""
    global text_model, clip_model, clip_processor, emotion_head

    logger.info(f"Loading text model: {TEXT_MODEL_NAME}")
    text_model = SentenceTransformer(TEXT_MODEL_NAME, device=DEVICE)

    logger.info(f"Loading CLIP model: {CLIP_MODEL_NAME}")
    clip_model = CLIPModel.from_pretrained(CLIP_MODEL_NAME).to(DEVICE)
    clip_processor = CLIPProcessor.from_pretrained(CLIP_MODEL_NAME)

    logger.info("Loading emotion head...")
    emotion_head = EmotionHead().to(DEVICE)

    if EMOTION_HEAD_PATH.exists():
        logger.info(f"Loading trained weights from {EMOTION_HEAD_PATH}")
        emotion_head.load_state_dict(torch.load(EMOTION_HEAD_PATH, map_location=DEVICE))
    else:
        logger.warning(
            f"No trained emotion head found at {EMOTION_HEAD_PATH}. "
            "Using random weights — run train.py first for meaningful results."
        )

    emotion_head.eval()
    logger.info(f"All models loaded on {DEVICE}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield


# --- FastAPI app ---
app = FastAPI(
    title="Holographic Spirograph Emotion Server",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (local network)
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response models ---
class EncodeRequest(BaseModel):
    type: str  # "text" or "image"
    value: str  # text string or base64-encoded image


class EmotionScore(BaseModel):
    name: str
    score: float


class EncodeResponse(BaseModel):
    emotions: dict[str, float]  # emotion_name -> score (0-1)
    top_emotions: list[EmotionScore]  # top 5 highest scores
    embedding_type: str  # "text" or "image"


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    device: str
    emotions_count: int


# --- Encoding functions ---
def encode_text(text: str) -> dict[str, float]:
    """Encode text to 42-dimension emotion vector."""
    with torch.no_grad():
        embedding = text_model.encode(text, convert_to_tensor=True, device=DEVICE)
        if embedding.dim() == 1:
            embedding = embedding.unsqueeze(0)
        scores = emotion_head.forward_text(embedding).squeeze(0).cpu().numpy()

    return {name: float(score) for name, score in zip(EMOTIONS, scores)}


def encode_image(image_b64: str) -> dict[str, float]:
    """Encode base64 image to 42-dimension emotion vector."""
    # Decode base64
    image_data = base64.b64decode(image_b64)
    image = Image.open(io.BytesIO(image_data)).convert("RGB")

    with torch.no_grad():
        inputs = clip_processor(images=image, return_tensors="pt").to(DEVICE)
        image_features = clip_model.get_image_features(**inputs)
        # Normalize
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        scores = emotion_head.forward_image(image_features).squeeze(0).cpu().numpy()

    return {name: float(score) for name, score in zip(EMOTIONS, scores)}


# --- Endpoints ---
@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        models_loaded=text_model is not None,
        device=DEVICE,
        emotions_count=NUM_EMOTIONS,
    )


@app.get("/emotions")
async def list_emotions():
    """Return the ordered list of all 42 emotion dimension names."""
    return {"emotions": EMOTIONS, "count": NUM_EMOTIONS}


@app.post("/encode", response_model=EncodeResponse)
async def encode(request: EncodeRequest):
    if request.type not in ("text", "image"):
        raise HTTPException(status_code=400, detail="type must be 'text' or 'image'")

    if not request.value:
        raise HTTPException(status_code=400, detail="value is required")

    if request.type == "text":
        emotions = encode_text(request.value)
    else:
        try:
            emotions = encode_image(request.value)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process image: {e}")

    # Sort by score descending for top emotions
    sorted_emotions = sorted(emotions.items(), key=lambda x: x[1], reverse=True)
    top_5 = [EmotionScore(name=name, score=score) for name, score in sorted_emotions[:5]]

    return EncodeResponse(
        emotions=emotions,
        top_emotions=top_5,
        embedding_type=request.type,
    )
