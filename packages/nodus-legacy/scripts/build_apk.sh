#!/bin/bash
# Project Nodus - Build & Deploy Standalone Android Launcher APK
set -e

echo "[Nodus Build] Step 1: Building production web assets..."
npm run build

echo "[Nodus Build] Step 2: Synchronizing assets to Android Shell app assets..."
npm run sync:assets

echo "[Nodus Build] Step 3: Android assets successfully prepared in android-shell/app/src/main/assets/frontend/"

# Check if ADB devices are attached
ADB_BIN="/home/en/.local/platform-tools/adb"
if [ -f "$ADB_BIN" ]; then
    DEVICES=$($ADB_BIN devices | grep -v "List" | grep "device$" | cut -f1)
    if [ -n "$DEVICES" ]; then
        echo "[Nodus Deploy] Synchronizing static web assets directly to SD card for fast webview fallback..."
        for dev in $DEVICES; do
            echo " -> Syncing frontend bundle to /sdcard/nodus/ on device: $dev"
            $ADB_BIN -s "$dev" shell "mkdir -p /sdcard/nodus/assets" 2>/dev/null || true
            $ADB_BIN -s "$dev" push dist/assets/* /sdcard/nodus/assets/ 2>/dev/null || true
            $ADB_BIN -s "$dev" push dist/index.html /sdcard/nodus/index.html 2>/dev/null || true
        done
    fi
fi

echo "========================================================================"
echo "  ✓ Android Asset Packaging & Sync Complete for com.nodus.launcher!  "
echo "========================================================================"
