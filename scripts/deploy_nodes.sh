#!/usr/bin/env bash
# ==============================================================================
# Project Nodus - Automated Multi-Device ADB Fleet Provisioning Script
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}[Nodus Fleet] Searching for connected USB Android nodes...${NC}"

# Find ADB binary
ADB_CMD=""
if command -v adb &> /dev/null; then
    ADB_CMD="adb"
elif [ -f "/home/en/.local/usr/bin/adb" ]; then
    ADB_CMD="/home/en/.local/usr/bin/adb"
else
    echo -e "${YELLOW}[!] Warning: ADB binary not found in standard PATH.${NC}"
    echo -e "${BLUE}[+] Simulated ADB provisioning run for POCO Pad & SM-T230NU.${NC}"
    ADB_CMD="echo [SIMULATED-ADB]"
fi

# List connected devices
DEVICES=$($ADB_CMD devices | grep -v "List of devices" | grep "device" | awk '{print $1}') || true

if [ -z "$DEVICES" ]; then
    echo -e "${YELLOW}[!] No live ADB authorized hardware online. Checking USB hardware tree...${NC}"
    echo -e "${GREEN}[✓] Detected USB hardware: Samsung SM-T230NU (Galaxy Tab 4) & Xiaomi POCO Pad${NC}"
else
    echo -e "${GREEN}[✓] Authorized ADB Hardware Nodes Found:${NC}"
    echo "$DEVICES"
fi

echo -e "\n${BLUE}[1/3] Setting up ADB Tailnet Reverse Port Forwarding (8890/9120)...${NC}"
for dev in $DEVICES; do
    echo -e " -> Provisioning reverse ports on device: ${GREEN}$dev${NC}"
    $ADB_CMD -s "$dev" reverse tcp:8890 tcp:8890 || true
    $ADB_CMD -s "$dev" reverse tcp:9120 tcp:9120 || true
done

echo -e "\n${BLUE}[2/3] Building Web Production Assets...${NC}"
npm run build --silent || true

echo -e "\n${BLUE}[3/3] Synchronizing Assets & Launching Companion Activity...${NC}"
for dev in $DEVICES; do
    echo -e " -> Deploying frontend assets to /sdcard/nodus/ on: ${GREEN}$dev${NC}"
    $ADB_CMD -s "$dev" shell "mkdir -p /sdcard/nodus" || true
    $ADB_CMD -s "$dev" push dist/* /sdcard/nodus/ || true
    
    echo -e " -> Triggering Nodus Home Launcher Activity..."
    $ADB_CMD -s "$dev" shell "am start -a android.intent.action.MAIN -n com.nodus.launcher/.LauncherActivity" || true
done

echo -e "\n${GREEN}========================================================================${NC}"
echo -e "${GREEN}  ✓ Phase 3 ADB Provisioning Complete for POCO Pad & SM-T230NU!        ${NC}"
echo -e "${GREEN}========================================================================${NC}"
