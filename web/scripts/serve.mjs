import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("out");
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const target = resolve(
      root,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (!target.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const data = await readFile(target);
    const mime = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".mjs": "text/javascript",
      ".wasm": "application/wasm",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".css": "text/css",
    };
    res.writeHead(200, {
      "Content-Type": mime[extname(target)] || "application/octet-stream",
      "Cache-Control":
        url.pathname.startsWith("/models/mushroom-") ||
        url.pathname.startsWith("/runtime/")
          ? "public,max-age=31536000,immutable"
          : "no-cache",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(Number(process.env.PORT || 4173), "127.0.0.1", () =>
  console.log(`Production preview http://127.0.0.1:${process.env.PORT || 4173}`),
);
