import tensorflow as tf
from config import MODEL_PATH

def load_trained_model(model_path=None):
    """Load the trained MobileNetV2 head model weights."""
    target_path = model_path or MODEL_PATH
    if not target_path.exists():
        raise FileNotFoundError(f"Model file not found at {target_path}")
    model = tf.keras.models.load_model(target_path)
    return model

def build_mobilenetv2_classifier(input_shape=(224, 224, 3)):
    """Constructs MobileNetV2 feature extractor with surgical triage head."""
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet"
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=input_shape)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = base_model(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(1, activation="sigmoid")(x)

    model = tf.keras.Model(inputs, outputs, name="DermaLens_MobileNetV2")
    return model
