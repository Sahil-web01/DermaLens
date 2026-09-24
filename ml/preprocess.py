import numpy as np
import tensorflow as tf
from PIL import Image
from config import CONFIG

def prepare_image(pil_image):
    """
    Standardize wound photo with proportional padding and outer border
    matching training-time preprocessing pipeline.
    """
    inner_size = CONFIG.get("inner_size", 204)
    border = CONFIG.get("border", 10)
    pad_value = CONFIG.get("padding_value", 128.0)

    # Convert PIL Image to float32 tensor
    image = tf.convert_to_tensor(np.asarray(pil_image), dtype=tf.float32)

    # Resize preserving aspect ratio with centered padding
    image = tf.image.resize_with_pad(
        image - pad_value,
        target_height=inner_size,
        target_width=inner_size,
        method="bilinear",
        antialias=True
    ) + pad_value

    # Add outer border to match square input dimensions
    image = tf.pad(
        image,
        paddings=[[border, border], [border, border], [0, 0]],
        constant_values=pad_value
    )

    # Clip pixel intensities to [0, 255]
    return tf.clip_by_value(image, 0.0, 255.0).numpy()

def load_and_preprocess_image(image_path):
    """Load an image from disk and apply preprocessing."""
    pil_image = Image.open(image_path).convert("RGB")
    processed = prepare_image(pil_image)
    return np.expand_dims(processed, axis=0)
