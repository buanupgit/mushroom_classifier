import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import vm from "node:vm";
const reference = JSON.parse(
  readFileSync("tests/fixtures/reference.json", "utf8"),
);
test("Lanczos preprocessing matches Pillow pixel for pixel", () => {
  const context = vm.createContext({ Float32Array, Uint8Array, Math });
  vm.runInContext(readFileSync("public/preprocess.js", "utf8"), context);
  const image = PNG.sync.read(readFileSync("tests/fixtures/reference.png"));
  const actual = context.MushroomPreprocess.resizeRGB(
    image.data,
    image.width,
    image.height,
  );
  const bytes = readFileSync("tests/fixtures/reference.f32");
  const expected = new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / 4,
  );
  let max = 0;
  for (let i = 0; i < actual.length; i++)
    max = Math.max(max, Math.abs(actual[i] - expected[i]));
  expect(max).toBe(0);
});
test("production browser inference matches TensorFlow; cached reload and mobile layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Deep learning. Closer to nature." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Ready", {
    timeout: 90000,
  });
  await page
    .getByLabel("Upload mushroom image")
    .setInputFiles("tests/fixtures/reference.png");
  await page.getByRole("button", { name: "Classify photograph" }).click();
  await expect(page.getByTestId("raw-score")).toHaveText(/\d/, {
    timeout: 60000,
  });
  const score = Number(await page.getByTestId("raw-score").textContent());
  expect(Math.abs(score - reference.tensorflow)).toBeLessThan(0.0001);
  const first = await page.evaluate(() => ({
    paint: performance
      .getEntriesByType("paint")
      .map((p) => ({ name: p.name, ms: p.startTime })),
    resources: performance
      .getEntriesByType("resource")
      .map((r) => ({ name: r.name, duration: r.duration })),
  }));
  const timing = await page.locator(".timing").innerText();
  await page.getByRole("button", { name: "Classify photograph" }).click();
  await expect(page.getByTestId("raw-score")).toHaveText(/\d/);
  const repeatTiming = await page.locator(".timing").innerText();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  await page.locator("h1").click();
  if (testInfo.project.name === "chromium")
    await page.screenshot({ path: "../docs/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Use dark theme" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Ready", {
    timeout: 60000,
  });
  const cached = await page.evaluate(async () => {
    const c = await caches.open("mushroom-model-v1");
    return (await c.keys()).length;
  });
  // Windows Playwright WebKit drops CacheStorage entries across reloads.
  // Verify persistent caching on Chromium/Firefox and inference fallback on every engine.
  if (testInfo.project.name !== "webkit") expect(cached).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (testInfo.project.name === "chromium")
    await page.screenshot({ path: "../docs/mobile.png", fullPage: true });
  expect(errors).toEqual([]);
  expect(
    requests.every(
      (url) =>
        url.startsWith("http://127.0.0.1:4173") ||
        url.startsWith("blob:") ||
        url.startsWith(process.env.TEST_BASE_URL || "http://127.0.0.1:4173"),
    ),
  ).toBe(true);
  writeFileSync(
    `../docs/browser-report-${testInfo.project.name}.json`,
    JSON.stringify(
      {
        score,
        tensorflow: reference.tensorflow,
        absoluteError: Math.abs(score - reference.tensorflow),
        timing,
        repeatTiming,
        first,
        cacheEntries: cached,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
});
test("invalid and corrupt files are handled", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Upload mushroom image")
    .setInputFiles({
      name: "bad.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("bad"),
    });
  await expect(page.locator("p[role=alert]")).toContainText("JPEG");
  await page
    .getByLabel("Upload mushroom image")
    .setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    });
  await expect(page.getByRole("status")).toContainText("Ready", {
    timeout: 90000,
  });
  await page.getByRole("button", { name: "Classify photograph" }).click();
  await expect(page.locator("p[role=alert]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Classify photograph" }),
  ).toBeEnabled();
});
test("missing manifest provides a retry", async ({ page }) => {
  await page.route("**/models/manifest.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry loading" }),
  ).toBeVisible();
  await page.unroute("**/models/manifest.json");
  await page.getByRole("button", { name: "Retry loading" }).click();
  await expect(page.getByRole("status")).toContainText("Ready", {
    timeout: 90000,
  });
});

test("real mushroom photographs preserve predictions across JPEG, PNG and WebP", async ({
  page,
}, testInfo) => {
  const report = JSON.parse(
    readFileSync("../docs/real-image-report.json", "utf8"),
  );
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Ready", {
    timeout: 90000,
  });
  const rows = [];
  for (const item of report.comparisons) {
    await page
      .getByLabel("Upload mushroom image")
      .setInputFiles(`tests/fixtures/real/${item.file}`);
    await page.getByRole("button", { name: "Classify photograph" }).click();
    await expect(page.getByTestId("raw-score")).toHaveText(/\d/);
    const score = Number(await page.getByTestId("raw-score").textContent());
    const error = Math.abs(score - item.tensorflow);
    rows.push({
      file: item.file,
      tensorflow: item.tensorflow,
      browser: score,
      absoluteError: error,
      classAgreement: score > 0.5 === item.tensorflow > 0.5,
    });
    expect(error).toBeLessThan(0.005); // JPEG decoding can differ across browsers and Pillow.
    expect(score > 0.5).toBe(item.tensorflow > 0.5);
  }
  writeFileSync(
    `../docs/real-browser-report-${testInfo.project.name}.json`,
    JSON.stringify(rows, null, 2),
  );
});
test("mobile viewport can classify and reject transparency", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Ready", {
    timeout: 90000,
  });
  await page
    .getByLabel("Upload mushroom image")
    .setInputFiles("tests/fixtures/real/boletus.png");
  await page.getByRole("button", { name: "Classify photograph" }).click();
  await expect(page.getByTestId("prediction")).toHaveText("Edible");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Classify photograph" }),
  ).toBeDisabled();
  const transparent = new PNG({ width: 10, height: 10 });
  transparent.data.fill(0);
  await page
    .getByLabel("Upload mushroom image")
    .setInputFiles({
      name: "transparent.png",
      mimeType: "image/png",
      buffer: PNG.sync.write(transparent),
    });
  await page.getByRole("button", { name: "Classify photograph" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("opaque");
});
