#!/bin/bash
set -e
npm install --prefer-offline --no-audit --no-fund < /dev/null
npm run db:push --force < /dev/null 2>&1 || true
