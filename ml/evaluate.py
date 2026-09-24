import numpy as np
from model import load_trained_model
from dataset import load_wound_dataset

def evaluate_model(data_dir=None):
    """Evaluate model performance on the test split."""
    print("Loading test dataset...")
    test_ds = load_wound_dataset(data_dir=data_dir, subset="test")
    if test_ds is None:
        print("[Notice] Test dataset directory not found. Please populate ml/data/test.")
        return

    print("Loading trained MobileNetV2 model...")
    model = load_trained_model()
    results = model.evaluate(test_ds)
    print(f"Test Loss: {results[0]:.4f} | Test Accuracy: {results[1]:.4f}")
    return results

if __name__ == "__main__":
    evaluate_model()
