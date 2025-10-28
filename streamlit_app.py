"""
Mushroom Classification App - Streamlit Version
Optimized for Streamlit Cloud Deployment
"""

import streamlit as st
import tensorflow as tf
from tensorflow import keras
import numpy as np
from PIL import Image
import os

# Page configuration
st.set_page_config(
    page_title="Mushroom Classifier",
    page_icon="🍄",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Custom CSS for better styling
st.markdown("""
    <style>
    .main {
        padding: 2rem;
    }
    .stButton>button {
        width: 100%;
        background-color: #2ecc71;
        color: white;
        font-size: 1.2rem;
        padding: 0.75rem;
        border-radius: 10px;
        border: none;
        font-weight: bold;
    }
    .stButton>button:hover {
        background-color: #27ae60;
    }
    .success-box {
        padding: 1.5rem;
        border-radius: 10px;
        background-color: #d4edda;
        border: 2px solid #28a745;
        margin: 1rem 0;
    }
    .danger-box {
        padding: 1.5rem;
        border-radius: 10px;
        background-color: #f8d7da;
        border: 2px solid #dc3545;
        margin: 1rem 0;
    }
    .warning-box {
        padding: 1rem;
        border-radius: 10px;
        background-color: #fff3cd;
        border: 2px solid #ffc107;
        margin: 1rem 0;
    }
    </style>
""", unsafe_allow_html=True)

# Configuration
MODEL_PATH = "mushroom_model.h5"  # Model should be in same directory for Streamlit Cloud
IMG_SIZE = (224, 224)
CLASS_NAMES = ["Edible", "Poisonous"]


@st.cache_resource
def load_model():
    """Load model with caching to avoid reloading"""
    try:
        if not os.path.exists(MODEL_PATH):
            st.error(f"❌ Model file not found at: {MODEL_PATH}")
            st.info("Please ensure 'mushroom_model.h5' is in the same directory as this script.")
            return None

        model = keras.models.load_model(MODEL_PATH)
        return model
    except Exception as e:
        st.error(f"Error loading model: {e}")
        return None


def preprocess_image(image):
    """
    Preprocess image for EfficientNetB0 model.
    Accepts any size image and resizes to 224x224.
    """
    try:
        # Convert to PIL Image if necessary
        if isinstance(image, np.ndarray):
            image = Image.fromarray(image.astype('uint8'))

        # Convert to RGB if image has alpha channel or is grayscale
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Resize to 224x224 (required by EfficientNetB0)
        image = image.resize(IMG_SIZE, Image.LANCZOS)

        # Convert to numpy array
        img_array = np.array(image)

        # Normalize pixel values to [0, 1]
        img_array = img_array.astype('float32') / 255.0

        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)

        return img_array

    except Exception as e:
        st.error(f"Error preprocessing image: {e}")
        return None


def predict_mushroom(model, image):
    """Make prediction on mushroom image"""
    try:
        # Preprocess the image
        processed_image = preprocess_image(image)

        if processed_image is None:
            return None

        # Make prediction
        with st.spinner("Analyzing mushroom..."):
            prediction = model.predict(processed_image, verbose=0)

        # Get probability for poisonous (class 1)
        poisonous_prob = float(prediction[0][0])

        # Calculate edible probability (class 0)
        edible_prob = 1.0 - poisonous_prob

        # Determine the predicted class
        predicted_class = "Poisonous" if poisonous_prob > 0.5 else "Edible"
        confidence = max(poisonous_prob, edible_prob) * 100

        result = {
            'prediction': predicted_class,
            'confidence': confidence,
            'edible_prob': edible_prob * 100,
            'poisonous_prob': poisonous_prob * 100,
            'is_poisonous': poisonous_prob > 0.5
        }

        return result

    except Exception as e:
        st.error(f"Error during prediction: {e}")
        return None


# Main App
def main():
    # Header
    st.title("🍄 Mushroom Classification")
    st.markdown("### Is it Poisonous or Edible?")
    st.markdown("---")

    # Description
    st.markdown("""
    Upload an image of a mushroom to identify if it's **poisonous** or **edible**.

    This model uses **EfficientNetB0** architecture trained on mushroom images.
    Images will be automatically resized to 224x224 pixels.
    """)

    # Load model
    model = load_model()

    if model is None:
        st.error("⚠️ Cannot proceed without a valid model. Please check the model file.")
        st.stop()

    st.success("✅ Model loaded successfully!")

    # File uploader
    st.markdown("---")
    uploaded_file = st.file_uploader(
        "Choose a mushroom image...",
        type=["jpg", "jpeg", "png"],
        help="Upload a clear image of the mushroom (JPG, JPEG, or PNG)"
    )

    if uploaded_file is not None:
        # Display the uploaded image
        image = Image.open(uploaded_file)

        col1, col2 = st.columns([1, 1])

        with col1:
            st.markdown("#### 📷 Uploaded Image")
            st.image(image, use_column_width=True)
            st.caption(f"Size: {image.size[0]}x{image.size[1]} pixels")

        with col2:
            st.markdown("#### 🔍 Prediction Results")

            # Make prediction
            result = predict_mushroom(model, image)

            if result is not None:
                # Display result
                if result['is_poisonous']:
                    st.markdown(f"""
                    <div class="danger-box">
                        <h2 style="color: #721c24; margin: 0;">☠️ Poisonous</h2>
                        <p style="font-size: 1.2rem; margin: 0.5rem 0;">
                            <strong>Confidence:</strong> {result['confidence']:.2f}%
                        </p>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div class="success-box">
                        <h2 style="color: #155724; margin: 0;">✅ Edible</h2>
                        <p style="font-size: 1.2rem; margin: 0.5rem 0;">
                            <strong>Confidence:</strong> {result['confidence']:.2f}%
                        </p>
                    </div>
                    """, unsafe_allow_html=True)

                # Probability breakdown
                st.markdown("#### 📊 Probability Breakdown")

                col_a, col_b = st.columns(2)

                with col_a:
                    st.metric(
                        label="🟢 Edible",
                        value=f"{result['edible_prob']:.2f}%"
                    )

                with col_b:
                    st.metric(
                        label="🔴 Poisonous",
                        value=f"{result['poisonous_prob']:.2f}%"
                    )

                # Progress bars
                st.markdown("##### Confidence Visualization")
                st.progress(result['edible_prob'] / 100)
                st.caption(f"Edible: {result['edible_prob']:.2f}%")

                st.progress(result['poisonous_prob'] / 100)
                st.caption(f"Poisonous: {result['poisonous_prob']:.2f}%")

    # Disclaimer
    st.markdown("---")
    st.markdown("""
    <div class="warning-box">
        <h3 style="margin-top: 0;">⚠️ IMPORTANT DISCLAIMER</h3>
        <p>
            This tool is for <strong>educational purposes only</strong>.
            Never consume wild mushrooms based solely on AI predictions.
            Always consult with a professional mycologist or expert before
            consuming any wild mushrooms.
        </p>
        <p style="margin-bottom: 0;">
            <strong>Mushroom misidentification can be fatal. Stay safe!</strong>
        </p>
    </div>
    """, unsafe_allow_html=True)

    # Footer
    st.markdown("---")
    st.markdown("""
    ### About This Model

    - **Architecture**: EfficientNetB0 (Transfer Learning)
    - **Training Data**: Kaggle Mushroom Classification Dataset
    - **Input Size**: 224x224 pixels (auto-resized)
    - **Classes**: Edible (0) and Poisonous (1)

    ### Technology Stack
    - TensorFlow/Keras
    - EfficientNet
    - Streamlit

    ### Dataset Source
    [Kaggle Mushroom Classification Dataset](https://www.kaggle.com/datasets/zedsden/mushroom-classification-dataset)

    ### Authors
    **Anup**

    ---

    Made with ❤️ for mushroom enthusiasts and ML practitioners
    """)


if __name__ == "__main__":
    main()
