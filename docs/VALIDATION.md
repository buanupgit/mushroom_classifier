# Local validation and deployment status

The original model successfully converts and runs in-browser. Production static export succeeds. Vercel production deployment is live at https://mushroom-atlas.vercel.app and was verified on 17 October 2026 (Europe/Oslo). See `live-report.json`. All 18 local tests pass across Chromium, Firefox and WebKit.

## Evidence

See `conversion-report.json`, `real-image-report.json`, per-engine `browser-report-*.json` / `real-browser-report-*.json`, and `performance-report.json`. Tests use the original trained model, never a placeholder.

Synthetic conversion checks are within 3.815e-6 absolute score difference. The six real-image fixtures come from two photographs and do not measure generalization or class accuracy. No representative original validation set was supplied. Near-threshold predictions remain a limitation of the available validation coverage.

Lanczos resizing matches Pillow 10.1.0 exactly on the deterministic RGB reference. Native decoding, orientation and color handling may differ on untested images. Transparent inputs are explicitly rejected to avoid silently changing hidden RGB values.

## Performance measurement scope

Measurements use the production export served over localhost on this Windows desktop, with headless browsers. No physical phone or real internet network is represented. Model download/cache read, initialization, first and subsequent inference are measured separately. Lighthouse applies its own simulated mobile settings.

The model is 17.33 MB (16.52 MiB); WASM is 11.25 MB. The page does not await these resources. Cache reuse is checked after reload. A JavaScript heap snapshot is recorded when supported, but total/peak browser memory including WASM is not reliably measured and is not claimed.

No quantization is deployed: the baseline is small and fast enough for the local tests, while the missing validation dataset prevents a defensible accuracy-impact claim. WebGPU/WebGL acceleration is not enabled; WASM avoids device-specific GPU operator compatibility.

## Known limitations

- Original training dataset, notebook, evaluation results and class-index export are unavailable.
- No original validation-distribution accuracy or calibration estimate.
- A binary model still produces a label for unrelated images.
- Browser engine and mobile viewport testing cannot replace real iOS/Android hardware testing.
- Public Vercel asset delivery and six real-image predictions are verified. Regional download times and hosting quota behavior have not been benchmarked.
- `npm audit` reports an unpatched development-only transitive `braces` stack-exhaustion advisory through Next's ESLint plugin. The suggested major downgrade is not applied. `npm audit --omit=dev` is checked separately; these lint dependencies are not shipped in the static output.

## Recorded desktop measurements

Local Chromium, production static export; one measured cold/warm pair (not a statistical distribution):

| Measurement | Cold visit | Warm visit |
| --- | ---: | ---: |
| First contentful paint | 108 ms | 32 ms |
| Model download/cache read + integrity/cache work | 127 ms | 24.7 ms |
| WASM/session initialization | 404 ms | 371.4 ms |
| Model ready after navigation | 1,300 ms | 1,047 ms |
| First inference | 88.1 ms | 80.9 ms |
| Subsequent inference | 62.2 ms | 62.8 ms |
| First full image processing | 130.5 ms | 117.6 ms |

Lighthouse (simulated mobile, localhost): performance 96, accessibility 100, best practices 100, SEO 100. See `lighthouse.json` for settings and diagnostics. Actual network/device performance will differ.

On browsers without OffscreenCanvas, image decoding uses a regular canvas on the page; Lanczos resizing and ONNX inference still run in the worker.

Windows Playwright WebKit successfully runs real-image inference but its CacheStorage entries disappear across reloads (a direct cache.put/key probe reproduces this). Persistent cache assertions apply to Chromium and Firefox; WebKit is verified to recover through fetching/HTTP cache without losing inference. This is not a claim about every Safari installation.

## Live deployment verification

Six real-image fixtures (two photographs in JPEG, PNG and WebP) ran on the production URL with maximum absolute score difference 1.953e-6 from original TensorFlow output and matching class decisions. Model Cache-Control is `public, max-age=31536000, immutable`; the manifest revalidates. Chromium reported no page errors or external requests. Inference took 66?88 ms on this desktop; total image processing took 96?467 ms depending on image size. This is a small numerical check, not an accuracy estimate.
