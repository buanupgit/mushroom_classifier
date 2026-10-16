import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import lighthouse from "lighthouse";
const browser = await chromium.launch({
  args: ["--remote-debugging-port=9222"],
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__modelEvents = [];
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        super(...args);
        this.addEventListener("message", ({ data }) =>
          window.__modelEvents.push({ ...data, at: performance.now() }),
        );
      }
    };
  });
  const visits = [];
  for (const visit of ["cold", "warm"]) {
    await page.goto((process.env.TEST_BASE_URL || "http://127.0.0.1:4173/"));
    await page.waitForFunction(
      () => window.__modelEvents.some((e) => e.type === "ready"),
      {},
      { timeout: 90000 },
    );
    await page
      .getByLabel("Upload mushroom image")
      .setInputFiles("tests/fixtures/real/boletus.png");
    await page.getByRole("button", { name: "Classify photograph" }).click();
    await page.waitForFunction(() =>
      window.__modelEvents.some((e) => e.type === "result"),
    );
    await page.getByRole("button", { name: "Classify photograph" }).click();
    await page.waitForFunction(
      () =>
        window.__modelEvents.filter((e) => e.type === "result").length === 2,
    );
    visits.push({
      visit,
      ...(await page.evaluate(() => ({
        ready: window.__modelEvents.find((e) => e.type === "ready"),
        results: window.__modelEvents.filter((e) => e.type === "result"),
        paints: performance
          .getEntriesByType("paint")
          .map((p) => ({ name: p.name, ms: p.startTime })),
        jsHeapBytes: performance.memory?.usedJSHeapSize,
        note: "JS heap snapshot excludes total WASM/browser memory; this is not peak memory.",
      }))),
    });
  }
  await page.locator("h1").click();
  await page.screenshot({ path: "../docs/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "../docs/mobile.png", fullPage: true });
  await writeFile(
    "../docs/performance-report.json",
    JSON.stringify(
      {
        environment:
          "Local Windows desktop, headless Chromium, localhost, no network throttling; not a deployed/mobile-device benchmark",
        visits,
      },
      null,
      2,
    ),
  );
  const audit = await lighthouse((process.env.TEST_BASE_URL || "http://127.0.0.1:4173/"), {
    port: 9222,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
  });
  await writeFile("../docs/lighthouse.json", audit.report);
  console.log(
    JSON.stringify(
      {
        visits,
        categories: Object.fromEntries(
          Object.entries(audit.lhr.categories).map(([key, value]) => [
            key,
            value.score,
          ]),
        ),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
