# Emotion Encoding Server

Docker-based server that encodes text and images into a 42-dimension emotional
vector for the Holographic Spirograph.

## Quick Start

### 1. Build the Docker image

```bash
cd server
docker build -t holospiro-emotion .
```

This pre-downloads the ML models (~500MB) into the image.

### 2. Train the emotion head

The emotion head maps text/image embeddings to our 42 emotion dimensions.
It needs to be trained once before the server produces meaningful results.

```bash
# Create a volume for persistent model storage
docker volume create holospiro-models

# Train (takes ~5-10 minutes on GPU, ~30 min on CPU)
docker run --gpus all -v holospiro-models:/models holospiro-emotion python train.py
```

Options:
- `--epochs 20` — more epochs for better quality
- `--max-samples 5000` — limit GoEmotions data for faster testing
- `--add-synthetic 100` — more synthetic examples per dimension
- `--resume` — continue training from a checkpoint

### 3. Run the server

```bash
docker run --gpus all -v holospiro-models:/models -p 8420:8420 holospiro-emotion
```

Or with docker-compose:
```bash
docker-compose up -d
```

The server is now at `http://YOUR_IP:8420`.

### 4. Connect the client

In the spirograph app, open settings → Emotion Server → enter your server URL:
```
http://192.168.x.x:8420
```

The status indicator will show "Connected" when the server is reachable.

## API

### `GET /health`
Check server status.

### `GET /emotions`
List all 42 emotion dimension names.

### `POST /encode`
Encode text or image to emotion vector.

```json
{
  "type": "text",
  "value": "I love you more than words can express"
}
```

Response:
```json
{
  "emotions": {
    "joy": 0.12,
    "love": 0.87,
    "warmth": 0.65,
    ...
  },
  "top_emotions": [
    {"name": "love", "score": 0.87},
    {"name": "warmth", "score": 0.65},
    ...
  ],
  "embedding_type": "text"
}
```

For images, send base64-encoded image data:
```json
{
  "type": "image",
  "value": "/9j/4AAQSkZJRg..."
}
```

## 42 Emotion Dimensions

| Category | Dimensions |
|----------|-----------|
| Primary (8) | joy, sadness, anger, fear, surprise, disgust, trust, anticipation |
| Secondary (12) | nostalgia, awe, serenity, melancholy, tenderness, excitement, tension, playfulness, longing, pride, shame, curiosity |
| Relational (10) | love, intimacy, belonging, isolation, empathy, reverence, gratitude, devotion, vulnerability, connection |
| Experiential (6) | wonder, transcendence, bittersweetness, hope, grief, ecstasy |
| Aesthetic (6) | warmth, coldness, complexity, intensity, fragility, grandeur |

## Unraid Setup

1. Copy the `server/` directory to your Unraid share
2. In Unraid's Docker tab, add a new container:
   - Repository: build from the Dockerfile
   - Port: 8420 → 8420
   - Volume: /mnt/user/appdata/holospiro → /models
3. Open a terminal in the container and run `python train.py`
4. The server auto-starts on container boot

## Fine-tuning (future)

The system is designed for user fine-tuning. You can add your own labeled
examples to improve the emotion mapping for your specific use case. This
feature will be added in a future update via a `POST /fine-tune` endpoint.
