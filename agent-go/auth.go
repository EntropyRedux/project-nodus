package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const maxClockSkewSeconds = 30

func getSharedKeyPath() string {
	if custom := os.Getenv("NODUS_SHARED_KEY_PATH"); custom != "" {
		return custom
	}
	if custom := os.Getenv("NOVA_SHARED_KEY_PATH"); custom != "" {
		return custom
	}
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}

	primary := filepath.Join(home, ".nodus", "shared.key")
	if _, err := os.Stat(primary); err == nil {
		return primary
	}
	// Fallback to legacy path if present
	legacy := filepath.Join(home, ".nova", "shared.key")
	if _, err := os.Stat(legacy); err == nil {
		return legacy
	}
	return primary
}

func loadSharedKey() ([]byte, error) {
	if envKey := os.Getenv("NODUS_SHARED_KEY"); envKey != "" {
		return hex.DecodeString(strings.TrimSpace(envKey))
	}
	if envKey := os.Getenv("NOVA_SHARED_KEY"); envKey != "" {
		return hex.DecodeString(strings.TrimSpace(envKey))
	}

	keyPath := getSharedKeyPath()
	raw, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("shared key not found at %s: %w", keyPath, err)
	}
	return hex.DecodeString(strings.TrimSpace(string(raw)))
}

func canonicalPayload(action string, timestamp int64, nonce string, params map[string]any) string {
	if params == nil {
		params = make(map[string]any)
	}
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	ordered := make(map[string]any, len(params))
	for _, k := range keys {
		ordered[k] = params[k]
	}
	b, _ := json.Marshal(ordered)
	return fmt.Sprintf("%s|%d|%s|%s", action, timestamp, nonce, string(b))
}

func computeSignature(key []byte, action string, timestamp int64, nonce string, params map[string]any) string {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(canonicalPayload(action, timestamp, nonce, params)))
	return hex.EncodeToString(h.Sum(nil))
}

func verifySignature(key []byte, msg RpcMessage) error {
	now := time.Now().Unix()
	if abs(now-msg.Timestamp) > maxClockSkewSeconds {
		return fmt.Errorf("stale or future timestamp (diff: %ds, max allowed: %ds)", abs(now-msg.Timestamp), maxClockSkewSeconds)
	}
	expectedSig := computeSignature(key, msg.Action, msg.Timestamp, msg.Nonce, msg.Params)

	if subtle.ConstantTimeCompare([]byte(expectedSig), []byte(msg.Sig)) != 1 {
		return fmt.Errorf("invalid signature")
	}
	return nil
}

func abs(n int64) int64 {
	if n < 0 {
		return -n
	}
	return n
}
