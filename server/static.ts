import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function setNoCacheHeaders(res: express.Response) {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html") || filePath.endsWith("sw.js") || filePath.endsWith("manifest.json")) {
          setNoCacheHeaders(res);
        }
      },
    }),
  );

  app.use("/{*path}", (_req, res) => {
    setNoCacheHeaders(res);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
