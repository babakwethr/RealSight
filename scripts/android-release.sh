#!/usr/bin/env bash
# Build a signed Google Play AAB.
#
# Prerequisites:
#   - android/realsight-upload.jks (signing key; see docs/GOOGLE_PLAY_LAUNCH.md §2.2)
#   - UPLOAD_STORE_PASSWORD + UPLOAD_KEY_PASSWORD in env (e.g. ~/.zshenv)
#   - Java 17+ + Android SDK installed locally
#   - `npm install` already run
#
# Output: android/app/build/outputs/bundle/release/app-release.aab
# Upload that file to Play Console → RealSight → Internal Testing / Production.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Build web bundle (Vite)"
npm run build

echo "→ Sync Capacitor → android/"
npx cap sync android

echo "→ Gradle bundleRelease"
cd android
./gradlew bundleRelease

OUTPUT="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$OUTPUT" ]; then
  SIZE=$(du -h "$OUTPUT" | cut -f1)
  echo ""
  echo "✅ AAB built — $(realpath "$OUTPUT") ($SIZE)"
  echo ""
  echo "Next step:"
  echo "  1. Open https://play.google.com/console"
  echo "  2. RealSight → Testing → Internal testing → Create new release"
  echo "  3. Upload the .aab above"
else
  echo "❌ Build failed — AAB not found at $OUTPUT"
  exit 1
fi
