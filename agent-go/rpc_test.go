package main

import (
	"encoding/hex"
	"testing"
	"time"
)

func TestDispatchAllowlistValidation(t *testing.T) {
	keyHex := "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899"
	key, _ := hex.DecodeString(keyHex)

	now := time.Now().Unix()
	nonce := "rpc-test-nonce-1"
	params := map[string]any{"commandId": "non-existent-cmd"}

	sig := computeSignature(key, "RUN_COMMAND", now, nonce, params)
	msg := RpcMessage{
		ID:        "test-rpc-1",
		Action:    "RUN_COMMAND",
		Params:    params,
		Timestamp: now,
		Nonce:     nonce,
		Sig:       sig,
	}

	resp := dispatch(key, msg)
	if resp.Status != "ERROR" {
		t.Fatalf("Expected ERROR for unlisted command, got %s", resp.Status)
	}

	// Test PING action
	pingNonce := "rpc-test-nonce-ping"
	pingSig := computeSignature(key, "PING", now, pingNonce, nil)
	pingMsg := RpcMessage{
		ID:        "ping-1",
		Action:    "PING",
		Params:    nil,
		Timestamp: now,
		Nonce:     pingNonce,
		Sig:       pingSig,
	}

	pingResp := dispatch(key, pingMsg)
	if pingResp.Status != "OK" {
		t.Fatalf("Expected OK for PING, got %s: %s", pingResp.Status, pingResp.Error)
	}
}
