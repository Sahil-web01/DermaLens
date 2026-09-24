import tensorflow as tf
from config import CONFIG, MODEL_PATH
from dataset import load_wound_dataset
from model import build_mobilenetv2_classifier

def train():
    """
    Fine-tune MobileNetV2 head on surgical wound monitoring dataset.
    """
    print("Loading training and validation datasets...")
    train_ds = load_wound_dataset(subset="train")
    val_ds = load_wound_dataset(subset="val")

    if train_ds is None:
        print("[Notice] Training dataset directory not found. Please populate ml/data/train.")
        return

    print("Building model architecture...")
    model = build_mobilenetv2_classifier()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=CONFIG.get("learning_rate", 1e-4)),
        loss=tf.keras.losses.BinaryCrossentropy(),
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")]
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True),
        tf.keras.callbacks.ModelCheckpoint(filepath=str(MODEL_PATH), save_best_only=True)
    ]

    print("Beginning training...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=CONFIG.get("epochs", 15),
        callbacks=callbacks
    )

    print(f"Training finished. Best weights saved to {MODEL_PATH}")
    return history

if __name__ == "__main__":
    train()
