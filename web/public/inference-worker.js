/* Inference stays in this worker; all resources are served from this origin. */
importScripts("/runtime/1.20.1/ort.wasm.min.js", "/preprocess.js");
ort.env.wasm.wasmPaths = "/runtime/1.20.1/";
ort.env.wasm.numThreads = 1;
let session, manifest, initializing;
const send = (type, data = {}) => postMessage({ type, ...data });
async function initialize() {
  const start = performance.now();
  const meta = await fetch("/models/manifest.json", { cache: "no-cache" });
  if (!meta.ok) throw new Error("Model manifest is unavailable. Please retry.");
  manifest = await meta.json();
  let cache, cached;
  try {
    cache = await caches.open("mushroom-model-v1");
    cached = await cache.match(manifest.url);
  } catch {
    /* HTTP cache still works */
  }
  let bytes;
  if (cached) bytes = await cached.arrayBuffer();
  else {
    const response = await fetch(manifest.url);
    if (!response.ok)
      throw new Error(
        "Model download failed. Check your connection and retry.",
      );
    if (!response.body) bytes = await response.arrayBuffer();
    else {
      const reader = response.body.getReader(),
        chunks = [];
      let length = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        length += value.length;
        send("progress", {
          progress: Math.min(100, Math.round((length / manifest.bytes) * 100)),
        });
      }
      const joined = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        joined.set(chunk, offset);
        offset += chunk.length;
      }
      bytes = joined.buffer;
    }
  }
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== manifest.sha256) {
    if (cache) await cache.delete(manifest.url);
    throw new Error("Model integrity check failed. Please retry the download.");
  }
  if (cache && !cached) {
    try {
      await cache.put(manifest.url, new Response(bytes));
      for (const key of await cache.keys())
        if (new URL(key.url).pathname !== manifest.url) await cache.delete(key);
    } catch {
      /* Storage full/private mode: inference can still proceed */
    }
  }
  const downloadMs = performance.now() - start;
  send("initializing");
  const init = performance.now();
  session = await ort.InferenceSession.create(bytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  send("ready", {
    version: manifest.version,
    bytes: manifest.bytes,
    cached: !!cached,
    downloadMs,
    initMs: performance.now() - init,
  });
}
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      initializing ??= initialize().catch((error) => {
        initializing = null;
        throw error;
      });
      await initializing;
    }
    if (data.type === "predict") {
      await initializing;
      if (!session)
        throw new Error("The model is not ready. Retry loading it.");
      const start = performance.now();
      let pixels = data.pixels,
        width = data.width,
        height = data.height;
      if (!pixels) {
        const bitmap = await createImageBitmap(data.file, {
          imageOrientation: "none",
          premultiplyAlpha: "none",
          colorSpaceConversion: "none",
        });
        width = bitmap.width;
        height = bitmap.height;
        if (width * height > 24000000) {
          bitmap.close();
          throw new Error(
            "Image exceeds 24 megapixels. Please use a smaller image.",
          );
        }
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        pixels = context.getImageData(0, 0, width, height).data;
      }
      // Canvas discards hidden RGB under transparency; reject it rather than silently alter preprocessing.
      for (let i = 3; i < pixels.length; i += 4)
        if (pixels[i] !== 255)
          throw new Error(
            "Please use an opaque image. Transparent images cannot preserve the original RGB preprocessing.",
          );
      const input = MushroomPreprocess.resizeRGB(pixels, width, height);
      const preprocessMs = performance.now() - start;
      const run = performance.now();
      const output = await session.run({
        [manifest.inputName]: new ort.Tensor(
          "float32",
          input,
          manifest.inputShape,
        ),
      });
      const score = Number(output[manifest.outputName].data[0]);
      if (!Number.isFinite(score) || score < 0 || score > 1)
        throw new Error("The model returned an invalid score.");
      send("result", {
        id: data.id,
        score,
        preprocessMs,
        inferenceMs: performance.now() - run,
        totalMs: performance.now() - start + (data.decodeMs || 0),
      });
    }
  } catch (error) {
    send("error", {
      id: data.id,
      phase: data.type,
      message:
        error instanceof Error
          ? error.message
          : "Inference failed. Please retry.",
    });
  }
};
