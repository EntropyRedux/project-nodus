#!/usr/bin/env bash
# ==============================================================================
# Project Nodus - Cross-Compile Go Agent for ARMv7 (KitKat Linux Deploy Chroot)
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}[Nodus Build] Cross-compiling Go agent for ARMv7 (Linux Deploy Chroot)...${NC}"

# Check for go executable
GO_CMD=""
if command -v go &> /dev/null; then
    GO_CMD="go"
elif [ -f "/usr/local/go/bin/go" ]; then
    GO_CMD="/usr/local/go/bin/go"
else
    echo -e "${YELLOW}[!] Warning: Go compiler not found on build host.${NC}"
    echo -e "${YELLOW}[+] Generating cross-compilation command instructions for target environment:${NC}"
    echo -e "${GREEN}    GOOS=linux GOARCH=arm GOARM=7 go build -o agent-go/nodus-agent-armv7 ./agent-go${NC}"
    exit 0
fi

cd agent-go
env GOOS=linux GOARCH=arm GOARM=7 $GO_CMD build -ldflags="-s -w" -o nodus-agent-armv7 .
cd ..

echo -e "${GREEN}[✓] Successfully compiled agent-go/nodus-agent-armv7 binary!${NC}"
