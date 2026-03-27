#!/bin/bash
set -e
npm install --prefer-offline --no-audit --no-fund < /dev/null
npx tsx scripts/pre-push-sync.ts < /dev/null 2>&1 || true
npm run db:push --force < /dev/null 2>&1 || true
