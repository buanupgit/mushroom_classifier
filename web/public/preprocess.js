/* Pillow-compatible separable Lanczos3: 22-bit fixed-point coefficients,
   rounded/clipped uint8 intermediate, then RGB float32 / 255. */
(function (root) {
  function kernel(x) {
    if (x === 0) return 1;
    if (x <= -3 || x >= 3) return 0;
    const p = x * Math.PI;
    return (Math.sin(p) / p) * (Math.sin(p / 3) / (p / 3));
  }
  function coefficients(input, output) {
    const scale = input / output,
      filterScale = Math.max(scale, 1),
      support = 3 * filterScale;
    return Array.from({ length: output }, (_, i) => {
      const center = (i + 0.5) * scale;
      const start = Math.max(0, Math.trunc(center - support + 0.5));
      const end = Math.min(input, Math.trunc(center + support + 0.5));
      const weights = Array.from({ length: end - start }, (_, j) =>
        kernel((j + start - center + 0.5) / filterScale),
      );
      const sum = weights.reduce((a, b) => a + b, 0);
      return {
        start,
        weights: weights.map((w) =>
          Math.trunc((w / sum) * 4194304 + (w < 0 ? -0.5 : 0.5)),
        ),
      };
    });
  }
  const clip = (value) =>
    Math.max(0, Math.min(255, Math.floor(value / 4194304)));
  function resizeRGB(rgba, width, height, size = 224) {
    const horizontal = coefficients(width, size),
      vertical = coefficients(height, size);
    const temp = new Uint8Array(size * height * 3),
      out = new Float32Array(size * size * 3);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < size; x++)
        for (let c = 0; c < 3; c++) {
          let value = 2097152;
          const { start, weights } = horizontal[x];
          for (let k = 0; k < weights.length; k++)
            value += rgba[(y * width + start + k) * 4 + c] * weights[k];
          temp[(y * size + x) * 3 + c] = clip(value);
        }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        for (let c = 0; c < 3; c++) {
          let value = 2097152;
          const { start, weights } = vertical[y];
          for (let k = 0; k < weights.length; k++)
            value += temp[((start + k) * size + x) * 3 + c] * weights[k];
          out[(y * size + x) * 3 + c] = clip(value) / 255;
        }
    return out;
  }
  root.MushroomPreprocess = { resizeRGB };
})(globalThis);
