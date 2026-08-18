package main

import (
	"encoding/hex"
	"testing"
	"time"
)

func TestAuthHMACSigningAndVerification(t *testing.T) {
	keyHex := "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		t.Fatalf("Failed to decode key: %v", err)
	}

	now := time.Now().Unix()
	nonce := "a1b2c3d4e5f60708"
	params := map[string]any{"pid": 1234, "signal": "SIGKILL"}

	sig := computeSignature(key, "KILL_PROCESS", now, nonce, params)
	if sig == "" {
		t.Fatalf("Signature should not be empty")
	}

	msg := RpcMessage{
		ID:        "msg-1",
		Action:    "KILL_PROCESS",
		Params:    params,
		Timestamp: now,
		Nonce:     nonce,
		Sig:       sig,
	}

	if err := verifySignature(key, msg); err != nil {
		t.Fatalf("Valid signature rejected: %v", err)
	}

	// Test tampered payload
	tamperedMsg := msg
	tamperedMsg.Params = map[string]any{"pid": 9999}
	if err := verifySignature(key, tamperedMsg); err == nil {
		t.Fatalf("Tampered payload should have failed signature verification")
	}

	// Test stale timestamp (e.g. 60 seconds ago)
	staleMsg := msg
	staleMsg.Timestamp = now - 60
	staleMsg.Sig = computeSignature(key, staleMsg.Action, staleMsg.Timestamp, staleMsg.Nonce, staleMsg.Params)
	if err := verifySignature(key, staleMsg); err == nil {
		t.Fatalf("Stale timestamp should have been rejected")
	}
}

func TestNonceAntiReplay(t *testing.T) {
	nonce := "unique-nonce-12345"

	// First attempt should succeed
	if err := checkNonce(nonce); err != nil {
		t.Fatalf("Initial nonce should be accepted: %v", err)
	}

	// Immediate replay attempt should fail
	if err := checkNonce(nonce); err == nil {
		t.Fatalf("Duplicate nonce should be rejected")
	}
}
