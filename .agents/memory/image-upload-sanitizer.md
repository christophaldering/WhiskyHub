---
name: Image upload EXIF/GPS sanitizer
description: How/where uploaded images are stripped of metadata, and the rules that keep it leak-proof.
---

# Image upload sanitizer

All uploaded images flow through ONE chokepoint in `server/routes.ts`:
`uploadBufferToObjectStorage()` → `maybeCompressImage()`. The sharp
re-encode to webp (rotate → resize → webp) is what strips EXIF/GPS.

**Rule:** any change to image-upload handling must keep the sanitizer
universal and fail-closed.

**Why:** photos can carry GPS/home-location EXIF; "valuable collection +
home address" is a real safety risk (user feedback). A re-encode that
silently falls back to the original on error re-introduces the leak.

**How to apply:**
- Keep the multer upload allowlists (mimetypes/exts) in sync with the
  sanitizer's `COMPRESSIBLE_IMAGE_TYPES` + `sniffImageType()`. An image
  format accepted by multer but unknown to the sanitizer = a fail-open
  bypass (this is exactly how GIF slipped through once).
- Detect images by magic bytes too, not just declared Content-Type —
  clients send `application/octet-stream`/wrong types.
- On sanitize failure for anything that IS an image (declared OR
  sniffed): THROW (reject the upload). Only true non-images pass
  through untouched.
- HEIC/HEIF: try sharp first, fall back to `heic-convert` (pure JS/WASM)
  only when sharp can't decode; prebuilt sharp on the deploy image may
  lack HEIC support even when the dev box has it.
- GIF: read with `{ animated: true }` and skip `.rotate()` so animated
  GIFs become animated webp instead of being flattened.
- Note: sharp in this env cannot synthesize a multi-frame animated GIF
  fixture (pages stays 1), so animated-frame preservation can't be
  unit-proven locally — needs a real GIF fixture in CI.
