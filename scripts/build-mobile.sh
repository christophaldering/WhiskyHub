#!/bin/bash
set -e

echo "=== CaskSense Mobile Build ==="
echo ""

echo "1. Building web app..."
npm run build

echo ""
echo "2. Syncing with Capacitor..."
npx cap sync

echo ""
echo "=== Build complete! ==="
echo ""
echo "Next steps:"
echo "  iOS:     npx cap open ios      (requires Mac with Xcode)"
echo "  Android: npx cap open android  (requires Android Studio)"
