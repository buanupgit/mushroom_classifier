"""
Utility functions for mushroom classification
Image preprocessing, model loading, and helper functions
"""

import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow import keras
import os


class MushroomClassifier:
    """
    Mushroom Classification utility class
    Handles model loading, preprocessing, and prediction
    """

    def __init__(self, model_path, img_size=(224, 224)):
        """
        Initialize the classifier

        Args:
            model_path: Path to the .h5 model file
            img_size: Target image size (width, height)
        """
        self.model_path = model_path
        self.img_size = img_size
        self.class_names = ["Edible", "Poisonous"]
        self.model = None
        self.load_model()

    def load_model(self):
        """Load the trained model from file"""
        try:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model file not found: {self.model_path}")

            print(f"Loading model from {self.model_path}...")
            self.model = keras.models.load_model(self.model_path)
            print("Model loaded successfully!")
            return True

        except Exception as e:
            print(f"Error loading model: {e}")
            self.model = None
            return False

    def preprocess_image(self, image):
        """
        Preprocess image for EfficientNetB0 model.
        Accepts any size image and resizes to 224x224.

        Args:
            image: PIL Image, numpy array, or file path

        Returns:
            Preprocessed numpy array ready for prediction
        """
        # Handle different input types
        if isinstance(image, str):
            # Image path provided
            image = Image.open(image)
        elif isinstance(image, np.ndarray):
            # Numpy array provided
            image = Image.fromarray(image.astype('uint8'))
        elif not isinstance(image, Image.Image):
            raise ValueError("Image must be PIL Image, numpy array, or file path")

        # Convert to RGB if image has alpha channel or is grayscale
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Resize to required size (224x224 for EfficientNetB0)
        image = image.resize(self.img_size, Image.LANCZOS)

        # Convert to numpy array
        img_array = np.array(image)

        # Normalize pixel values to [0, 1]
        img_array = img_array.astype('float32') / 255.0

        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)

        return img_array

    def predict(self, image, return_probs=False):
        """
        Predict mushroom class

        Args:
            image: Input image (PIL Image, numpy array, or file path)
            return_probs: If True, return probabilities instead of class name

        Returns:
            Dictionary with prediction results
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Cannot make predictions.")

        try:
            # Preprocess image
            processed_image = self.preprocess_image(image)

            # Make prediction
            prediction = self.model.predict(processed_image, verbose=0)

            # Get probability for poisonous (class 1)
            poisonous_prob = float(prediction[0][0])

            # Calculate edible probability (class 0)
            edible_prob = 1.0 - poisonous_prob

            # Determine predicted class
            predicted_class = self.class_names[1] if poisonous_prob > 0.5 else self.class_names[0]
            confidence = max(poisonous_prob, edible_prob)

            result = {
                'prediction': predicted_class,
                'confidence': confidence,
                'probabilities': {
                    'edible': edible_prob,
                    'poisonous': poisonous_prob
                },
                'is_poisonous': poisonous_prob > 0.5
            }

            return result

        except Exception as e:
            raise RuntimeError(f"Prediction failed: {str(e)}")

    def predict_batch(self, images):
        """
        Predict multiple images at once

        Args:
            images: List of images (PIL Images, numpy arrays, or file paths)

        Returns:
            List of prediction dictionaries
        """
        if self.model is None:
            raise RuntimeError("Model not loaded. Cannot make predictions.")

        results = []
        for image in images:
            try:
                result = self.predict(image)
                results.append(result)
            except Exception as e:
                results.append({'error': str(e)})

        return results


def preprocess_image_simple(image_path, img_size=(224, 224)):
    """
    Simple function to preprocess a single image.
    Standalone version without class.

    Args:
        image_path: Path to image file
        img_size: Target size (width, height)

    Returns:
        Preprocessed numpy array
    """
    # Load image
    image = Image.open(image_path)

    # Convert to RGB
    if image.mode != 'RGB':
        image = image.convert('RGB')

    # Resize
    image = image.resize(img_size, Image.LANCZOS)

    # Convert to array and normalize
    img_array = np.array(image).astype('float32') / 255.0

    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)

    return img_array


def format_prediction_output(prediction_dict, detailed=True):
    """
    Format prediction results for display

    Args:
        prediction_dict: Dictionary from predict() method
        detailed: If True, show detailed probabilities

    Returns:
        Formatted string
    """
    prediction = prediction_dict['prediction']
    confidence = prediction_dict['confidence'] * 100

    emoji = "☠️" if prediction_dict['is_poisonous'] else "✅"

    output = f"{emoji} Prediction: {prediction}\n"
    output += f"Confidence: {confidence:.2f}%\n"

    if detailed:
        edible_prob = prediction_dict['probabilities']['edible'] * 100
        poisonous_prob = prediction_dict['probabilities']['poisonous'] * 100

        output += f"\nDetailed Probabilities:\n"
        output += f"  🟢 Edible: {edible_prob:.2f}%\n"
        output += f"  🔴 Poisonous: {poisonous_prob:.2f}%\n"

    return output


def validate_image(image_path, max_size_mb=16):
    """
    Validate image file before processing

    Args:
        image_path: Path to image file
        max_size_mb: Maximum file size in megabytes

    Returns:
        Tuple (is_valid, error_message)
    """
    # Check if file exists
    if not os.path.exists(image_path):
        return False, "File does not exist"

    # Check file size
    file_size_mb = os.path.getsize(image_path) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        return False, f"File too large ({file_size_mb:.2f}MB). Max size: {max_size_mb}MB"

    # Try to open as image
    try:
        image = Image.open(image_path)
        image.verify()  # Verify it's a valid image
        return True, None
    except Exception as e:
        return False, f"Invalid image file: {str(e)}"


# Example usage
if __name__ == "__main__":
    # Example: Using the classifier class
    MODEL_PATH = "Saved model .h5/mushroom_classification_dropout0.8_adam0.001_batch128_5layers_removed.h5"

    # Initialize classifier
    classifier = MushroomClassifier(MODEL_PATH)

    # Example prediction (you would provide an actual image path)
    # result = classifier.predict("path/to/mushroom/image.jpg")
    # print(format_prediction_output(result))

    print("Utils module loaded successfully!")
    print("Use MushroomClassifier class for predictions")
