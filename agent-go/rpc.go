package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type RpcMessage struct {
	ID        string         `json:"id"`
	Action    string         `json:"action"`
	Params    map[string]any `json:"params"`
	Timestamp int64          `json:"timestamp"`
	Nonce     string         `json:"nonce"`
	Sig       string         `json:"sig"`
}

type RpcResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"` // OK | ERROR
	Result any    `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

type CommandDef struct {
	ID                 string   `json:"id"`
	Binary             string   `json:"binary"`
	ArgsTemplate       []string `json:"argsTemplate"`
	AllowedWorkingDirs []string `json:"allowedWorkingDirs"`
}

type CommandConfig struct {
	Commands []CommandDef `json:"commands"`
}

func (c *CommandConfig) find(id string) (CommandDef, bool) {
	for _, cmd := range c.Commands {
		if cmd.ID == id {
			return cmd, true
		}
	}
	return CommandDef{}, false
}

func (cmd *CommandDef) resolveArgs(params map[string]any) []string {
	resolved := make([]string, len(cmd.ArgsTemplate))
	for i, arg := range cmd.ArgsTemplate {
		val := arg
		for k, v := range params {
			placeholder := fmt.Sprintf("{%s}", k)
			val = strings.ReplaceAll(val, placeholder, fmt.Sprintf("%v", v))
		}
		resolved[i] = val
	}
	return resolved
}

func loadCommandConfig() (*CommandConfig, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}

	cfgPath := filepath.Join(home, ".nodus", "commands.json")
	if custom := os.Getenv("NODUS_COMMANDS_PATH"); custom != "" {
		cfgPath = custom
	} else if custom := os.Getenv("NOVA_COMMANDS_PATH"); custom != "" {
		cfgPath = custom
	} else if _, err := os.Stat(cfgPath); os.IsNotExist(err) {
		// Fallback to legacy path if present
		legacy := filepath.Join(home, ".nova", "commands.json")
		if _, err := os.Stat(legacy); err == nil {
			cfgPath = legacy
		}
	}

	data, err := os.ReadFile(cfgPath)
	if err != nil {
		// Return default allowlist if file does not exist yet
		return &CommandConfig{
			Commands: []CommandDef{
				{
					ID:                 "open-vscode",
					Binary:             "code",
					ArgsTemplate:       []string{"{path}"},
					AllowedWorkingDirs: []string{"C:\\Projects", "C:\\Tools", "/home", "/root"},
				},
				{
					ID:                 "lock-workstation",
					Binary:             "rundll32.exe",
					ArgsTemplate:       []string{"user32.dll,LockWorkStation"},
					AllowedWorkingDirs: []string{},
				},
			},
		}, nil
	}

	var cfg CommandConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse commands config: %w", err)
	}
	return &cfg, nil
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Safe: Listener runs exclusively within Tailnet mesh
}

var (
	nonceCache = map[string]time.Time{}
	nonceMu    sync.Mutex
)

func checkNonce(nonce string) error {
	if nonce == "" {
		return fmt.Errorf("missing nonce")
	}
	nonceMu.Lock()
	defer nonceMu.Unlock()

	now := time.Now()
	for n, t := range nonceCache {
		if now.Sub(t) > maxClockSkewSeconds*time.Second {
			delete(nonceCache, n)
		}
	}

	if _, exists := nonceCache[nonce]; exists {
		return fmt.Errorf("replayed nonce rejected: %s", nonce)
	}
	nonceCache[nonce] = now
	return nil
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	key, err := loadSharedKey()
	if err != nil {
		log.Printf("[nodus-agent] error loading shared key: %v", err)
		http.Error(w, "agent not paired or shared key missing", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[nodus-agent] websocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("[nodus-agent] peer connected from %s", r.RemoteAddr)

	for {
		var msg RpcMessage
		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("[nodus-agent] connection closed or read error: %v", err)
			return
		}

		resp := dispatch(key, msg)
		if err := conn.WriteJSON(resp); err != nil {
			log.Printf("[nodus-agent] write response error: %v", err)
			return
		}
	}
}

func dispatch(key []byte, msg RpcMessage) RpcResponse {
	if err := verifySignature(key, msg); err != nil {
		return RpcResponse{ID: msg.ID, Status: "ERROR", Error: "auth: " + err.Error()}
	}
	if err := checkNonce(msg.Nonce); err != nil {
		return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
	}

	switch msg.Action {
	case "PING":
		return RpcResponse{ID: msg.ID, Status: "OK", Result: map[string]any{"pong": true, "timestamp": time.Now().UnixMilli()}}

	case "GET_PROCESSES":
		procs, err := getProcesses()
		if err != nil {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
		}
		return RpcResponse{ID: msg.ID, Status: "OK", Result: procs}

	case "KILL_PROCESS":
		var targetPid int
		if pidFloat, ok := msg.Params["pid"].(float64); ok {
			targetPid = int(pidFloat)
		} else if pidInt, ok := msg.Params["pid"].(int); ok {
			targetPid = pidInt
		} else {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: "missing or invalid pid parameter"}
		}

		if err := killProcess(targetPid); err != nil {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
		}
		return RpcResponse{ID: msg.ID, Status: "OK", Result: fmt.Sprintf("Process %d terminated", targetPid)}

	case "RUN_COMMAND":
		id, ok := msg.Params["commandId"].(string)
		if !ok || id == "" {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: "missing commandId parameter"}
		}
		out, err := runAllowlistedCommand(id, msg.Params)
		if err != nil {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
		}
		return RpcResponse{ID: msg.ID, Status: "OK", Result: out}

	case "LOCK_WORKSTATION":
		out, err := lockWorkstation()
		if err != nil {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
		}
		return RpcResponse{ID: msg.ID, Status: "OK", Result: out}

	case "GET_TELEMETRY":
		telemetry, err := getTelemetry()
		if err != nil {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
		}
		return RpcResponse{ID: msg.ID, Status: "OK", Result: telemetry}

	case "LIST_DIRECTORY":
		reqPath, _ := msg.Params["path"].(string)
		if reqPath == "" {
			reqPath, _ = os.UserHomeDir()
		}
		if reqPath == "" {
			reqPath = "/"
		}
		entries, err := os.ReadDir(reqPath)
		if err != nil {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
		}
		type FileItem struct {
			Name      string `json:"name"`
			Path      string `json:"path"`
			IsDirectory bool `json:"isDirectory"`
			Size      int64  `json:"size"`
			ModTime   int64  `json:"modTime"`
		}
		var files []FileItem
		for _, e := range entries {
			info, _ := e.Info()
			size := int64(0)
			modTime := time.Now().Unix()
			if info != nil {
				size = info.Size()
				modTime = info.ModTime().Unix()
			}
			files = append(files, FileItem{
				Name:        e.Name(),
				Path:        filepath.Join(reqPath, e.Name()),
				IsDirectory: e.IsDir(),
				Size:        size,
				ModTime:     modTime,
			})
		}
		return RpcResponse{
			ID:     msg.ID,
			Status: "OK",
			Result: map[string]any{
				"currentPath": reqPath,
				"files":       files,
			},
		}

	case "TRANSFER_FILE":
		filePath, _ := msg.Params["filePath"].(string)
		if filePath == "" {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: "missing filePath parameter"}
		}
		data, err := os.ReadFile(filePath)
		if err != nil {
			return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
		}
		return RpcResponse{
			ID:     msg.ID,
			Status: "OK",
			Result: map[string]any{
				"filePath": filePath,
				"size":     len(data),
				"content":  string(data),
			},
		}

	default:
		return RpcResponse{ID: msg.ID, Status: "ERROR", Error: fmt.Sprintf("unrecognized action: %s", msg.Action)}
	}
}

func runAllowlistedCommand(id string, params map[string]any) (string, error) {
	cfg, err := loadCommandConfig()
	if err != nil {
		return "", err
	}
	cmdDef, ok := cfg.find(id)
	if !ok {
		return "", fmt.Errorf("command not in allowlist: %s", id)
	}

	args := cmdDef.resolveArgs(params)
	cmd := exec.Command(cmdDef.Binary, args...)

	if workDir, ok := params["workingDir"].(string); ok && workDir != "" {
		if len(cmdDef.AllowedWorkingDirs) > 0 {
			allowed := false
			for _, d := range cmdDef.AllowedWorkingDirs {
				if strings.HasPrefix(filepath.Clean(workDir), filepath.Clean(d)) {
					allowed = true
					break
				}
			}
			if !allowed {
				return "", fmt.Errorf("working directory '%s' not allowed for command '%s'", workDir, id)
			}
		}
		cmd.Dir = workDir
	}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("command execution error: %w (output: %s)", err, string(out))
	}
	return string(out), nil
}
