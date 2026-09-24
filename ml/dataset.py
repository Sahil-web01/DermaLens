import os
from pathlib import Path
import tensorflow as tf
from config import CONFIG, DATA_DIR

def load_wound_dataset(data_dir=None, subset="train"):
    """
    Load wound image dataset from structured class directories
    (e.g., data/train/normal and data/train/elevated).
    """
    target_dir = Path(data_dir or DATA_DIR) / subset
    if not target_dir.exists():
        return None

    dataset = tf.keras.utils.image_dataset_from_directory(
        target_dir,
        labels="inferred",
        label_mode="binary",
        image_size=(CONFIG["image_size"], CONFIG["image_size"]),
        batch_size=CONFIG["batch_size"],
        shuffle=(subset == "train")
    )
    return dataset
