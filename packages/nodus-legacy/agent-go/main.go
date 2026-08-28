package main

import (
	"log"
	"net/http"
	"os"

	"tailscale.com/tsnet"
)

func main() {
	hostname := os.Getenv("NODUS_HOSTNAME")
	if hostname == "" {
		hostname = os.Getenv("NOVA_HOSTNAME")
	}
	if hostname == "" {
		hostname = "nodus-desktop"
	}

	authKey := os.Getenv("TS_AUTHKEY")

	srv := &tsnet.Server{
		Hostname: hostname,
		Dir:      "./tsstate", // Persists node key between restarts
		AuthKey:  authKey,     // Optional pre-auth key for headless initialization
	}
	defer srv.Close()

	port := os.Getenv("NODUS_PORT")
	if port == "" {
		port = os.Getenv("NOVA_PORT")
	}
	if port == "" {
		port = "8890"
	}

	ln, err := srv.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("[nodus-agent] tsnet listen failed: %v", err)
	}
	defer ln.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWebSocket)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"online","project":"Project Nodus","hostname":"` + hostname + `"}`))
	})

	log.Printf("[nodus-agent] Project Nodus agent listening on Tailnet as %s:%s", hostname, port)
	if err := http.Serve(ln, mux); err != nil {
		log.Fatalf("[nodus-agent] http.Serve failed: %v", err)
	}
}
