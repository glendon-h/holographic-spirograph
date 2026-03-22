# Emotion Encoding Server for the Holographic Spirograph
# Runs on Unraid via Docker
#
# Build:  docker build -t holospiro-emotion .
# Train:  docker run --gpus all -v holospiro-models:/models holospiro-emotion python train.py
# Run:    docker run --gpus all -v holospiro-models:/models -p 8420:8420 holospiro-emotion

FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY emotions.py app.py train.py ./

# Create model directory
RUN mkdir -p /models
ENV MODEL_DIR=/models

# Pre-download models on build (so they're cached in the image)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
RUN python -c "from transformers import CLIPProcessor, CLIPModel; CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32'); CLIPModel.from_pretrained('openai/clip-vit-base-patch32')"

EXPOSE 8420

# Default: run the server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8420"]
