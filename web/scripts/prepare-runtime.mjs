import { createHash } from "node:crypto";
import { mkdir, copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";
const version = JSON.parse(
  await readFile("node_modules/onnxruntime-web/package.json", "utf8"),
).version;
const target = `public/runtime/${version}`;
await mkdir(target, { recursive: true });
for (const name of [
  "ort.wasm.min.js",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
]) {
  await copyFile(
    join("node_modules/onnxruntime-web/dist", name),
    join(target, name),
  );
}
console.log(`Prepared local ONNX runtime ${version}`);

const manifest = JSON.parse(await readFile("public/models/manifest.json", "utf8"));
const model = await readFile(`public${manifest.url}`);
if (model.length !== manifest.bytes || createHash("sha256").update(model).digest("hex") !== manifest.sha256) {
  throw new Error("Model manifest does not match the deployed artifact. Re-run conversion before building.");
}
