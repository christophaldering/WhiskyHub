// Preload health responder — runs as a separate process.
// Starts an HTTP server immediately so deployment healthchecks pass
// while the main application initializes (~5-7 seconds).
// The main app sends SIGTERM to this process when it's ready to take over.
const http = require("http");

const port = parseInt(process.env.PORT || "5000", 10);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    "<!DOCTYPE html><html><head><meta charset='utf-8'><title>CaskSense</title>" +
    "<meta http-equiv='refresh' content='3'></head>" +
    "<body style='background:#1a1714;color:#f5f0e8;font-family:system-ui;" +
    "display:flex;align-items:center;justify-content:center;min-height:100vh;" +
    "margin:0'><p>Starting up\u2026</p></body></html>"
  );
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("[preload] Closed, handing off to main app");
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000);
});

server.listen({ port, host: "0.0.0.0" }, () => {
  console.log("[preload] Health responder ready on port " + port);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log("[preload] Port already in use, main app is likely ready");
    process.exit(0);
  }
  console.error("[preload] Server error:", err.message);
});
