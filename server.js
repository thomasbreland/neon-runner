// Tiny Node static file server for Neon Runner.
// Serves the whole workspace (including node_modules/three) at http://localhost:8000
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 8000;
const ROOT = process.cwd();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  let url = req.url.split("?")[0];
  if (url === "/" || url === "") url = "/index.html";

  // Resolve inside ROOT only (containment check) — node_modules must be reachable.
  const abs = path.join(ROOT, path.normalize(decodeURIComponent(url)));
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  fs.readFile(abs, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    const ext = path.extname(abs);
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.end(data);
  });
}).listen(PORT);

console.log("Neon Runner static server listening on http://localhost:" + PORT);
