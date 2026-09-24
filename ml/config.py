import json
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

# Model and config file paths
MODEL_PATH = MODEL_DIR / "dermalens_mobilenetv2_head.keras"
CONFIG_PATH = MODEL_DIR / "preprocessing_config.json"

# Load default preprocessing hyperparameters
def load_config():
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    return {
        "image_size": 224,
        "inner_size": 204,
        "border": 10,
        "padding_value": 128.0,
        "batch_size": 32,
        "epochs": 15,
        "learning_rate": 0.0001
    }

CONFIG = load_config()
