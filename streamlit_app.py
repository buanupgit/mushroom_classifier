"""
Mushroom Classification App - Streamlit Version
Optimized for Streamlit Cloud Deployment with Custom EfficientNet Model
"""

import streamlit as st

# --- 1. PAGE CONFIGURATION (MUST BE FIRST!) ---
st.set_page_config(
    page_title="Mushroom Classifier",
    page_icon="🍄",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Now import other libraries
import tensorflow as tf
from tensorflow import keras
import numpy as np
from PIL import Image
import os

# Custom CSS for better styling
st.markdown("""
    <style>
    .main { padding: 2rem; }
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
    .stButton>button:hover { background-color: #27ae60; }
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
MODEL_PATH = "mushroom_model.h5"
IMG_SIZE = (224, 224)

# --- 2. CUSTOM DROPOUT CLASS (Required for loading your model) ---
@keras.utils.register_keras_serializable()
class FixedDropout(keras.layers.Dropout):
    """Custom Dropout layer to match EfficientNet's FixedDropout"""
    def _get_noise_shape(self, inputs):
        if self.noise_shape is None:
            return self.noise_shape
        symbolic_shape = tf.shape(inputs)
        noise_shape = [symbolic_shape[axis] if shape is None else shape
                      for axis, shape in enumerate(self.noise_shape)]
        return tuple(noise_shape)

# --- 3. MODEL LOADING WITH CUSTOM OBJECTS ---
@st.cache_resource
def load_model():
    """Load your custom Transfer Learning model with caching"""
    if not os.path.exists(MODEL_PATH):
        st.error(f"❌ Model file not found at: {MODEL_PATH}")
        st.info("Please upload your 'mushroom_model.h5' file to the repository.")
        return None
    
    try:
        # Custom objects dictionary to handle the FixedDropout layer
        custom_objects = {'FixedDropout': FixedDropout}
        
        # Load model without compiling (we only need it for inference)
        model = keras.models.load_model(
            MODEL_PATH, 
            custom_objects=custom_objects, 
            compile=False
        )
        return model
    except Exception as e:
        st.error(f"Error loading model: {str(e)}")
        st.info("Tip: Make sure your model file is compatible with TensorFlow 2.13.0")
        return None

# --- 4. PREPROCESSING (Matches your training code) ---
def preprocess_image(image):
    """
    Preprocess image for your custom EfficientNetB0 model.
    Includes normalization (1./255) as used in your training ImageDataGenerator.
    """
    try:
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Resize to 224x224 (your target_size)
        image = image.resize(IMG_SIZE, Image.LANCZOS)
        img_array = np.array(image)

        # Normalize pixel values to [0, 1] (Matches rescale=1./255)
        img_array = img_array.astype('float32') / 255.0

        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        st.error(f"Error preprocessing image: {str(e)}")
        return None

# --- 5. PREDICTION LOGIC ---
def predict_mushroom(model, image):
    """Make prediction using the Sigmoid output of your model"""
    try:
        processed_image = preprocess_image(image)
        if processed_image is None:
            return None

        with st.spinner("🔬 Analyzing mushroom..."):
            # Your model outputs a single value via layers.Dense(1, activation='sigmoid')
            prediction = model.predict(processed_image, verbose=0)

        # Class 0 = Edible, Class 1 = Poisonous (based on standard binary flow)
        poisonous_prob = float(prediction[0][0])
        edible_prob = 1.0 - poisonous_prob

        # Decision threshold at 0.5
        predicted_class = "Poisonous" if poisonous_prob > 0.5 else "Edible"
        confidence = max(poisonous_prob, edible_prob) * 100

        return {
            'prediction': predicted_class,
            'confidence': confidence,
            'edible_prob': edible_prob * 100,
            'poisonous_prob': poisonous_prob * 100,
            'is_poisonous': poisonous_prob > 0.5
        }
    except Exception as e:
        st.error(f"Error during prediction: {str(e)}")
        return None

# --- 6. MAIN APP INTERFACE ---
def main():
    st.title("🍄 Mushroom Classification")
    st.markdown("### Is it Poisonous or Edible?")
    st.markdown("---")

    st.markdown("""
    Upload an image of a mushroom to identify if it's **poisonous** or **edible**.
    This model uses a custom **EfficientNetB0** architecture with transfer learning.
    """)

    # Load the model
    model = load_model()

    if model is None:
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
        try:
            image = Image.open(uploaded_file)

            col1, col2 = st.columns([1, 1])

            with col1:
                st.markdown("#### 📷 Uploaded Image")
                st.image(image, use_column_width=True)

            with col2:
                st.markdown("#### 🔍 Prediction Results")
                result = predict_mushroom(model, image)

                if result is not None:
                    if result['is_poisonous']:
                        st.markdown(f"""
                        <div class="danger-box">
                            <h2 style="color: #721c24; margin: 0;">☠️ POISONOUS</h2>
                            <p style="font-size: 1.2rem; margin: 0.5rem 0;">
                                <strong>Confidence:</strong> {result['confidence']:.2f}%
                            </p>
                        </div>
                        """, unsafe_allow_html=True)
                    else:
                        st.markdown(f"""
                        <div class="success-box">
                            <h2 style="color: #155724; margin: 0;">✅ EDIBLE</h2>
                            <p style="font-size: 1.2rem; margin: 0.5rem 0;">
                                <strong>Confidence:</strong> {result['confidence']:.2f}%
                            </p>
                        </div>
                        """, unsafe_allow_html=True)

                    # Probability breakdown
                    st.markdown("#### 📊 Probability Breakdown")
                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.metric(label="🟢 Edible", value=f"{result['edible_prob']:.2f}%")
                    with col_b:
                        st.metric(label="🔴 Poisonous", value=f"{result['poisonous_prob']:.2f}%")

                    st.progress(result['poisonous_prob'] / 100)
                    st.caption(f"Risk Level: {result['poisonous_prob']:.2f}%")
        
        except Exception as e:
            st.error(f"Error processing uploaded file: {str(e)}")
            st.info("Please try uploading a different image file.")

    # Disclaimer
    st.markdown("---")
    st.markdown("""
    <div class="warning-box">
        <h3 style="margin-top: 0;">⚠️ IMPORTANT DISCLAIMER</h3>
        <p>This tool is for <strong>educational purposes only</strong>.
        <strong>Never consume wild mushrooms based solely on AI predictions.</strong>
        Mushroom misidentification can be <strong>fatal</strong>. 
        Always consult with a professional mycologist before consuming any wild mushrooms.</p>
    </div>
    """, unsafe_allow_html=True)

    # Footer
    st.markdown("---")
    st.markdown("### 🔬 Technology Stack")
    col1, col2 = st.columns(2)
    with col1:
        st.write("- **Model**: EfficientNetB0 (Transfer Learning)")
        st.write("- **Framework**: TensorFlow 2.13.0")
    with col2:
        st.write("- **Interface**: Streamlit")
        st.write("- **Author**: Anup")

if __name__ == "__main__":
    main()
