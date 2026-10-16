"""Compare ONNX and TensorFlow on attributed real-image smoke fixtures."""
from convert_model import ROOT, load_original, preprocess
from PIL import Image
import json
import onnxruntime as ort
folder=ROOT/'web/tests/fixtures/real'
# Additional formats exercise the browser decoders with known source pixels.
for name in ['amanita','boletus']:
    with Image.open(folder/f'{name}.jpg') as source:
        image=source.convert('RGB')
        image.thumbnail((800,800),Image.Resampling.LANCZOS)
        image.save(folder/f'{name}.png')
        image.save(folder/f'{name}.webp',lossless=True)
model=load_original()
meta=json.loads((ROOT/'web/public/models/manifest.json').read_text())
session=ort.InferenceSession(str(ROOT/'web/public'/meta['url'].lstrip('/')),providers=['CPUExecutionProvider'])
rows=[]
for file in sorted(folder.iterdir()):
    if file.suffix not in {'.jpg','.png','.webp'}:continue
    with Image.open(file) as image:x=preprocess(image)
    a=float(model(x,training=False).numpy()[0,0]);b=float(session.run(None,{meta['inputName']:x})[0][0,0])
    rows.append({'file':file.name,'tensorflow':a,'onnx':b,'absoluteError':abs(a-b),'classAgreement':(a>0.5)==(b>0.5)})
assert max(row['absoluteError'] for row in rows)<1e-4
assert all(row['classAgreement'] for row in rows)
report={'note':'Two source photographs in three formats; numerical smoke tests, not accuracy evaluation.','comparisons':rows}
(ROOT/'docs/real-image-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
