#!/bin/bash
# Usage: ./scripts/bump-version.sh [major|minor|patch]
# Bumps version in both package.json and shared/version.ts

BUMP_TYPE=${1:-patch}
CURRENT=$(node -e "console.log(require('./package.json').version)")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case $BUMP_TYPE in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [major|minor|patch]"; exit 1 ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
TODAY=$(date +%Y-%m-%d)

node -e "
const pkg = require('./package.json');
pkg.version = '$NEW_VERSION';
require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

sed -i "s/export const APP_VERSION = \".*\"/export const APP_VERSION = \"$NEW_VERSION\"/" shared/version.ts
sed -i "s/export const APP_RELEASE_DATE = \".*\"/export const APP_RELEASE_DATE = \"$TODAY\"/" shared/version.ts

echo "Version bumped: $CURRENT → $NEW_VERSION (release date: $TODAY)"
