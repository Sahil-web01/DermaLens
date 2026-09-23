import io
import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# 1. Initialize FastAPI App
app = FastAPI(
    title="DermaLens AI Inference Service",
    description="Surgical Wound Monitoring CNN Backend",
    version="1.0.0"
)

# Allow CORS so the Next.js/Node frontend can communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Global variables for model and config
MODEL_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODEL_DIR / "dermalens_mobilenetv2_head.keras"
CONFIG_PATH = MODEL_DIR / "preprocessing_config.json"

model = None
config = None

# 3. Load Model and Config on Startup
@app.on_event("startup")
async def load_model_and_config():
    global model, config
    try:
        print("Loading preprocessing config...")
        with open(CONFIG_PATH, "r") as f:
            config = json.load(f)
            
        print("Loading MobileNetV2 model...")
        model = tf.keras.models.load_model(MODEL_PATH)
        print("✅ DermaLens AI Model loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model/config: {e}")

# 4. Preprocessing Function (Replicating your Kaggle logic)
def prepare_image(pil_image):
    IMAGE_SIZE = config["image_size"]
    INNER_SIZE = config["inner_size"]
    BORDER = config["border"]
    PAD_VALUE = config["padding_value"]

    # Convert to tensor
    image = tf.convert_to_tensor(np.asarray(pil_image), dtype=tf.float32)
    
    # Preserve proportions with padding
    image = tf.image.resize_with_pad(
        image - PAD_VALUE,
        target_height=INNER_SIZE,
        target_width=INNER_SIZE,
        method="bilinear",
        antialias=True
    ) + PAD_VALUE

    # Add outer border
    image = tf.pad(
        image,
        paddings=[[BORDER, BORDER], [BORDER, BORDER], [0, 0]],
        constant_values=PAD_VALUE
    )
    
    # Clip values to valid pixel range
    return tf.clip_by_value(image, 0.0, 255.0).numpy()

# 5. Prediction Endpoint
@app.post("/analyze-wound")
async def analyze_wound(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        # Read and convert the uploaded image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Preprocess the image
        processed_img = prepare_image(image)
        
        # Add batch dimension -> Shape: (1, 224, 224, 3)
        input_tensor = np.expand_dims(processed_img, axis=0)
        
        # Run Inference
        prediction = model.predict(input_tensor)
        concern_score = float(prediction[0][0])
        
        # Apply the highly-tuned 0.50 threshold for clinical safety
        is_elevated = concern_score > 0.50
        
        # Return structured JSON for the frontend
        return {
            "status": "success",
            "filename": file.filename,
            "predictions": {
                "concern_score": round(concern_score, 4),
                "assessment_class": "Medium/High Concern" if is_elevated else "Low Concern",
                "requires_clinical_review": is_elevated
            },
            "model_metadata": {
                "threshold_applied": 0.50,
                "warning": "This is a triage support tool, not a diagnostic device."
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))