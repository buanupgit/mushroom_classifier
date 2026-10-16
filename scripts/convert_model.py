"""Convert the original model without retraining; emit a reproducible audit."""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
from pathlib import Path
import hashlib
import json
import argparse
import numpy as np
import tensorflow as tf
import tf2onnx
import onnxruntime as ort
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

@tf.keras.utils.register_keras_serializable()
class FixedDropout(tf.keras.layers.Dropout):
    def _get_noise_shape(self, inputs):
        if self.noise_shape is None:
            return self.noise_shape
        shape = tf.shape(inputs)
        return tuple(shape[i] if s is None else s for i, s in enumerate(self.noise_shape))

def load_original():
    return tf.keras.models.load_model(ROOT / 'mushroom_model.h5', custom_objects={'FixedDropout': FixedDropout}, compile=False)

def preprocess(image):
    return np.asarray(image.convert('RGB').resize((224, 224), Image.Resampling.LANCZOS), dtype=np.float32)[None] / 255.0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--images', type=Path, help='Optional real test-image directory')
    args = parser.parse_args()
    model = load_original()
    print('Original input:', model.input_shape, 'output:', model.output_shape, flush=True)
    public = ROOT / 'web/public/models'
    public.mkdir(parents=True, exist_ok=True)
    signature = (tf.TensorSpec((1, 224, 224, 3), tf.float32, name='image'),)
    proto, _ = tf2onnx.convert.from_keras(model, input_signature=signature, opset=17)
    data = proto.SerializeToString()
    digest = hashlib.sha256(data).hexdigest()
    filename = f'mushroom-{digest[:12]}.onnx'
    (public / filename).write_bytes(data)
    session = ort.InferenceSession(data, providers=['CPUExecutionProvider'])
    rng = np.random.default_rng(42)
    samples = [('zeros', np.zeros((1,224,224,3), np.float32)), ('ones', np.ones((1,224,224,3), np.float32))]
    samples += [(f'random-{i}', rng.random((1,224,224,3), dtype=np.float32)) for i in range(8)]
    real_count = 0
    if args.images:
        for path in sorted(args.images.rglob('*')):
            if path.suffix.lower() in {'.jpg','.jpeg','.png','.webp'}:
                with Image.open(path) as im:
                    samples.append((path.name, preprocess(im)))
                real_count += 1
    comparisons = []
    fixture_dir = ROOT / 'web/tests/fixtures'
    fixture_dir.mkdir(parents=True, exist_ok=True)
    # A deterministic RGB fixture exercises decode, resizing and full browser inference.
    fixture = Image.fromarray(rng.integers(0,256,(301,407,3),dtype=np.uint8))
    fixture.save(fixture_dir / 'reference.png')
    samples.append(('reference.png', preprocess(fixture)))
    preprocess(fixture).tofile(fixture_dir / 'reference.f32')
    for name, x in samples:
        expected = float(model(x, training=False).numpy().reshape(-1)[0])
        actual = float(session.run(None, {session.get_inputs()[0].name:x})[0].reshape(-1)[0])
        comparisons.append({'sample':name,'tensorflow':expected,'onnx':actual,'absolute_error':abs(expected-actual),'class_agreement':(expected>0.5)==(actual>0.5)})
    layers = [{'name':l.name,'type':type(l).__name__} for l in model.layers]
    metadata = {'version':digest[:12], 'url':f'/models/{filename}', 'sha256':digest, 'bytes':len(data), 'inputName':session.get_inputs()[0].name,'outputName':session.get_outputs()[0].name, 'inputShape':[1,224,224,3], 'labels':['Edible','Poisonous'], 'threshold':0.5, 'labelProvenance':'Existing Streamlit app; training class_indices not supplied.'}
    (public / 'manifest.json').write_text(json.dumps(metadata, indent=2))
    audit = {'tensorflow':tf.__version__,'keras':__import__('keras').__version__,'tf2onnx':tf2onnx.__version__,'onnxruntime':ort.__version__, 'source_sha256':hashlib.sha256((ROOT/'mushroom_model.h5').read_bytes()).hexdigest(), 'input_shape':model.input_shape,'output_shape':model.output_shape,'parameters':model.count_params(),'last_layer':model.layers[-1].get_config(),'layers':layers,'model':metadata,'real_image_count':real_count,'comparisons':comparisons,'max_absolute_error':max(c['absolute_error'] for c in comparisons)}
    (ROOT/'docs/conversion-report.json').write_text(json.dumps(audit,indent=2,default=str))
    reference = next(c for c in comparisons if c['sample']=='reference.png')
    (fixture_dir/'reference.json').write_text(json.dumps(reference,indent=2))
    assert audit['max_absolute_error'] < 1e-4, audit['max_absolute_error']
    assert all(c['class_agreement'] for c in comparisons), 'Class disagreement'
    print(json.dumps({'model':filename,'bytes':len(data),'max_absolute_error':audit['max_absolute_error'],'samples':len(samples),'real_images':real_count},indent=2))

if __name__ == '__main__':
    main()
