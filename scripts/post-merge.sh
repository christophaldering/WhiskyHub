#!/bin/bash
set -e
npm install --prefer-offline --no-audit --no-fund < /dev/null
npx tsx scripts/pre-push-sync.ts < /dev/null 2>&1 || true
npx drizzle-kit push --force < /dev/null 2>&1 || true
