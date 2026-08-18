# Remix NovaMinimal — Architecture Migration Spec
## Go Agent + Tailscale + HMAC Backend / Tauri + Android-Native Frontend Shells

**Audience:** coding agent implementing this migration.
**Constraint:** existing React 19 + TypeScript + Vite + Tailwind + Motion UI in `src/` is NOT rewritten. Only the transport layer (`src/utils/bridgeProtocol.ts` and below) and the native host wrappers change.

---

## 0. Summary of Changes

| Component | Before | After |
|---|---|---|
| Windows/Linux agent | PowerShell 7 HTTP + Node/Bun WS (duplicated) | Single Go binary, cross-compiled per OS |
| Device identity/pairing | Custom 6-digit secret + mDNS + SHA256 fingerprint | Tailscale (or Headscale) tailnet |
| RPC auth | None (token param unchecked) | HMAC-SHA256 signed envelope, per-device shared key |
| Command execution | Freeform `Invoke-Expression` / `exec()` | Allowlisted command IDs only |
| Desktop frontend host | Browser tab | Tauri (Rust shell), hidden-taskbar overlay window |
| Android frontend host | N/A (web only) | Native Activity w/ `HOME` intent category + WebView, hosting same React build |
| Android hardware actions | Accessibility Service (kept) | Unchanged, now connects outbound to Go hub over tailnet |

Directory layout after migration:

```
/nova
├── frontend/            # existing React app, UNCHANGED internally
│   └── src/utils/bridgeProtocol.ts   # rewritten client (Section 4)
├── agent-go/            # NEW: replaces nova-agent.ps1 and server.mjs
│   ├── main.go
│   ├── rpc.go
│   ├── auth.go
│   ├── agent_windows.go
│   ├── agent_linux.go
│   └── go.mod
├── desktop-shell/        # NEW: Tauri wrapper
│   ├── src-tauri/
│   │   ├── src/main.rs
│   │   └── tauri.conf.json
│   └── (points at ../frontend/dist)
└── android-shell/         # NEW: native launcher Activity
    ├── app/src/main/java/.../LauncherActivity.kt
    ├── app/src/main/java/.../NovaAccessibilityService.kt
    ├── app/src/main/java/.../NovaAgentClient.kt
    └── app/src/main/AndroidManifest.xml
```

---

## 1. Network Layer: Tailscale

### 1.1 Setup (manual, one-time per node)
```bash
# All nodes (Windows/Linux/Android/dev machine)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --hostname=nova-<devicerole>
```
Windows: install via `winget install tailscale.tailscale`, then `tailscale up`.

Record each node's tailnet IP (`tailscale ip -4`) — used later only for diagnostics; the Go agent resolves peers by MagicDNS name (`nova-desktop.tailXXXX.ts.net`), not raw IP.

### 1.2 Embedding tsnet in the Go agent (no external tailscale binary required on desktop nodes)
`agent-go/go.mod`:
```
module nova/agent

go 1.22

require (
    tailscale.com v1.70.0
    github.com/gorilla/websocket v1.5.3
)
```

`agent-go/main.go`:
```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"

    "tailscale.com/tsnet"
)

func main() {
    hostname := os.Getenv("NOVA_HOSTNAME")
    if hostname == "" {
        hostname = "nova-desktop"
    }

    srv := &tsnet.Server{
        Hostname: hostname,
        Dir:      "./tsstate", // persists node key between restarts
    }
    defer srv.Close()

    ln, err := srv.Listen("tcp", ":8890")
    if err != nil {
        log.Fatalf("tsnet listen failed: %v", err)
    }
    defer ln.Close()

    mux := http.NewServeMux()
    mux.HandleFunc("/ws", handleWebSocket) // defined in rpc.go
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(200)
        w.Write([]byte(`{"status":"online"}`))
    })

    log.Printf("[nova-agent] listening on tailnet as %s:8890", hostname)
    log.Fatal(http.Serve(ln, mux))
}

var _ = context.Background
```

First run opens a Tailscale auth URL in the log output — approve once per node in the admin console. Subsequent runs reuse `./tsstate`.

---

## 2. HMAC-Signed RPC Envelope (auth.go)

Replaces the unchecked `AuthToken` param and undefined "SHA256 fingerprint" from the old spec.

### 2.1 Wire format
```json
{
  "id": "uuid-v4",
  "action": "GET_PROCESSES",
  "params": {},
  "timestamp": 1755500000,
  "nonce": "8-byte-hex",
  "sig": "hex-hmac-sha256-of-canonical-payload"
}
```

Canonical payload for signing = `action + "|" + timestamp + "|" + nonce + "|" + json(params, sorted keys)`.

### 2.2 Shared key provisioning
Each device pair gets a 32-byte key generated once and stored locally (NOT transmitted over the wire — copy via QR code or manual paste during pairing, since Tailscale already guarantees network-level identity; HMAC key adds application-level authorization on top).

```bash
# generate once per device pair
openssl rand -hex 32 > nova-shared.key
```
Store at `~/.nova/shared.key` (desktop) / app-private storage (Android). Never commit this file.

### 2.3 `agent-go/auth.go`
```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "crypto/subtle"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "os"
    "sort"
    "time"
)

const maxClockSkewSeconds = 30

func loadSharedKey() ([]byte, error) {
    raw, err := os.ReadFile(os.ExpandEnv("$HOME/.nova/shared.key"))
    if err != nil {
        return nil, fmt.Errorf("shared key not found, run pairing first: %w", err)
    }
    return hex.DecodeString(string(raw))
}

func canonicalPayload(action string, timestamp int64, nonce string, params map[string]any) string {
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

func verifySignature(key []byte, msg RpcMessage) error {
    if abs(time.Now().Unix()-msg.Timestamp) > maxClockSkewSeconds {
        return fmt.Errorf("stale or future timestamp")
    }
    expected := hmac.New(sha256.New, key)
    expected.Write([]byte(canonicalPayload(msg.Action, msg.Timestamp, msg.Nonce, msg.Params)))
    expectedSig := hex.EncodeToString(expected.Sum(nil))

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
```

**Also track used nonces** (in-memory LRU, TTL = clock-skew window) to prevent replay attacks within the valid timestamp window — add a `nonceCache map[string]time.Time` guarded by a mutex in `rpc.go`, reject on collision.

---

## 3. Allowlisted Command Execution (replaces `EXECUTE_COMMAND` freeform)

### 3.1 Config file: `~/.nova/commands.json`
```json
{
  "commands": [
    {
      "id": "open-vscode",
      "binary": "code",
      "argsTemplate": ["{path}"],
      "allowedWorkingDirs": ["C:\\Projects", "C:\\Tools"]
    },
    {
      "id": "lock-workstation",
      "binary": "rundll32.exe",
      "argsTemplate": ["user32.dll,LockWorkStation"],
      "allowedWorkingDirs": []
    }
  ]
}
```

### 3.2 `agent-go/rpc.go` (core dispatcher)
```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os/exec"
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

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true }, // safe: tailnet-only listener
}

var (
    nonceCache = map[string]time.Time{}
    nonceMu    sync.Mutex
)

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    key, err := loadSharedKey()
    if err != nil {
        http.Error(w, "agent not paired", 500)
        return
    }

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("upgrade failed:", err)
        return
    }
    defer conn.Close()

    for {
        var msg RpcMessage
        if err := conn.ReadJSON(&msg); err != nil {
            return // connection closed
        }

        resp := dispatch(key, msg)
        conn.WriteJSON(resp)
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
        return RpcResponse{ID: msg.ID, Status: "OK", Result: "pong"}
    case "GET_PROCESSES":
        procs, err := getProcesses() // implemented per-OS
        if err != nil {
            return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
        }
        return RpcResponse{ID: msg.ID, Status: "OK", Result: procs}
    case "KILL_PROCESS":
        pid, _ := msg.Params["pid"].(float64)
        if err := killProcess(int(pid)); err != nil {
            return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
        }
        return RpcResponse{ID: msg.ID, Status: "OK"}
    case "RUN_COMMAND":
        id, _ := msg.Params["commandId"].(string)
        out, err := runAllowlistedCommand(id, msg.Params)
        if err != nil {
            return RpcResponse{ID: msg.ID, Status: "ERROR", Error: err.Error()}
        }
        return RpcResponse{ID: msg.ID, Status: "OK", Result: out}
    default:
        return RpcResponse{ID: msg.ID, Status: "ERROR", Error: "unknown action: " + msg.Action}
    }
}

func checkNonce(nonce string) error {
    nonceMu.Lock()
    defer nonceMu.Unlock()
    now := time.Now()
    for n, t := range nonceCache {
        if now.Sub(t) > maxClockSkewSeconds*time.Second {
            delete(nonceCache, n)
        }
    }
    if _, exists := nonceCache[nonce]; exists {
        return &replayError{}
    }
    nonceCache[nonce] = now
    return nil
}

type replayError struct{}

func (e *replayError) Error() string { return "replayed nonce rejected" }

func runAllowlistedCommand(id string, params map[string]any) (string, error) {
    cfg, err := loadCommandConfig()
    if err != nil {
        return "", err
    }
    cmdDef, ok := cfg.find(id)
    if !ok {
        return "", &unknownCommandError{id}
    }
    args := cmdDef.resolveArgs(params) // substitutes {path} etc. from params, validated
    cmd := exec.Command(cmdDef.Binary, args...)
    out, err := cmd.CombinedOutput()
    return string(out), err
}

type unknownCommandError struct{ id string }

func (e *unknownCommandError) Error() string { return "command not in allowlist: " + e.id }
```

### 3.3 Per-OS process handling
`agent-go/agent_windows.go`:
```go
//go:build windows

package main

import (
    "os/exec"
    "strconv"
    "strings"
)

type ProcInfo struct {
    PID       int    `json:"pid"`
    Name      string `json:"name"`
    MemoryMb  int    `json:"memoryMb"`
}

func getProcesses() ([]ProcInfo, error) {
    out, err := exec.Command("tasklist", "/FO", "CSV", "/NH").Output()
    if err != nil {
        return nil, err
    }
    var procs []ProcInfo
    for _, line := range strings.Split(string(out), "\r\n") {
        if line == "" {
            continue
        }
        fields := strings.Split(strings.Trim(line, `"`), `","`)
        if len(fields) < 5 {
            continue
        }
        pid, _ := strconv.Atoi(fields[1])
        mem := strings.NewReplacer(" K", "", ",", "").Replace(fields[4])
        memInt, _ := strconv.Atoi(mem)
        procs = append(procs, ProcInfo{PID: pid, Name: fields[0], MemoryMb: memInt / 1024})
    }
    return procs, nil
}

func killProcess(pid int) error {
    return exec.Command("taskkill", "/F", "/PID", strconv.Itoa(pid)).Run()
}
```

`agent-go/agent_linux.go`:
```go
//go:build linux

package main

import (
    "os"
    "strconv"
    "strings"
    "syscall"
)

type ProcInfo struct {
    PID      int    `json:"pid"`
    Name     string `json:"name"`
    MemoryMb int    `json:"memoryMb"`
}

func getProcesses() ([]ProcInfo, error) {
    entries, err := os.ReadDir("/proc")
    if err != nil {
        return nil, err
    }
    var procs []ProcInfo
    for _, e := range entries {
        pid, err := strconv.Atoi(e.Name())
        if err != nil {
            continue
        }
        comm, err := os.ReadFile("/proc/" + e.Name() + "/comm")
        if err != nil {
            continue
        }
        statm, _ := os.ReadFile("/proc/" + e.Name() + "/statm")
        fields := strings.Fields(string(statm))
        memMb := 0
        if len(fields) > 1 {
            pages, _ := strconv.Atoi(fields[1])
            memMb = (pages * os.Getpagesize()) / (1024 * 1024)
        }
        procs = append(procs, ProcInfo{PID: pid, Name: strings.TrimSpace(string(comm)), MemoryMb: memMb})
    }
    return procs, nil
}

func killProcess(pid int) error {
    return syscall.Kill(pid, syscall.SIGKILL)
}
```

### 3.4 Build
```bash
cd agent-go
GOOS=windows GOARCH=amd64 go build -o dist/nova-agent.exe .
GOOS=linux   GOARCH=amd64 go build -o dist/nova-agent-linux .
```

---

## 4. Frontend Bridge Client (only file in `frontend/` that changes)

`frontend/src/utils/bridgeProtocol.ts`:
```typescript
import { v4 as uuid } from 'uuid';

interface RpcParams { [key: string]: unknown; }

async function signPayload(action: string, timestamp: number, nonce: string, params: RpcParams, key: CryptoKey) {
  const sortedParams = JSON.stringify(params, Object.keys(params).sort());
  const payload = `${action}|${timestamp}|${nonce}|${sortedParams}`;
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export class NovaBridgeClient {
  private ws: WebSocket | null = null;
  private hmacKey: CryptoKey;
  private pending = new Map<string, (r: any) => void>();

  private constructor(hmacKey: CryptoKey) {
    this.hmacKey = hmacKey;
  }

  static async connect(tailnetHost: string, rawKeyHex: string): Promise<NovaBridgeClient> {
    const keyBytes = new Uint8Array(rawKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const hmacKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const client = new NovaBridgeClient(hmacKey);
    client.ws = new WebSocket(`wss://${tailnetHost}:8890/ws`);
    await new Promise((res, rej) => {
      client.ws!.onopen = res;
      client.ws!.onerror = rej;
    });
    client.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      client.pending.get(msg.id)?.(msg);
      client.pending.delete(msg.id);
    };
    return client;
  }

  async call(action: string, params: RpcParams = {}): Promise<any> {
    const id = uuid();
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.getRandomValues(new Uint8Array(8)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    const sig = await signPayload(action, timestamp, nonce, params, this.hmacKey);

    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.ws!.send(JSON.stringify({ id, action, params, timestamp, nonce, sig }));
    });
  }
}
```

Everything in `DeviceProcessSidePanel.tsx`, `ProcessMonitorApp.tsx`, etc. that previously called the old bridge continues to work by swapping the import — call sites (`bridge.send('KILL_PROCESS', {pid})`) become `client.call('KILL_PROCESS', {pid})`. No component logic changes.

---

## 5. Desktop Shell: Tauri (hidden taskbar, sidebar overlay, device switcher)

### 5.1 Install
```bash
cd desktop-shell
npm create tauri-app@latest -- --template react-ts
# point package.json "build" script at ../frontend, or symlink frontend/dist into desktop-shell/dist
```

### 5.2 `desktop-shell/src-tauri/tauri.conf.json` (key fields)
```json
{
  "productName": "NovaMinimal",
  "identifier": "com.novalauncher.desktop",
  "app": {
    "windows": [
      {
        "title": "Nova",
        "width": 380,
        "height": 720,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "visible": false,
        "x": 1540,
        "y": 40
      }
    ]
  },
  "bundle": { "active": true, "targets": ["nsis", "appimage"] }
}
```
`skipTaskbar: true` + `decorations: false` gives the hidden-taskbar overlay effect. `visible: false` on launch — summon via global shortcut.

### 5.3 Global hotkey + tray icon (`src-tauri/src/main.rs`)
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    tray::TrayIconBuilder, menu::{Menu, MenuItem},
    GlobalShortcutManager, Manager,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            app.global_shortcut_manager()
                .register("CmdOrCtrl+Shift+N", move || {
                    if let Some(win) = handle.get_webview_window("main") {
                        let visible = win.is_visible().unwrap_or(false);
                        if visible { win.hide().unwrap(); } else { win.show().unwrap(); win.set_focus().unwrap(); }
                    }
                })
                .unwrap();

            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;
            TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" { app.exit(0); }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 5.4 Run
```bash
cd desktop-shell
npm run tauri dev      # dev
npm run tauri build    # produces installer/AppImage
```

No changes needed in the React app for Tauri — it renders as a normal webview; `NovaBridgeClient` connects to `localhost`'s tailnet-scoped Go agent identically to how it would in a browser.

---

## 6. Android Shell: Native Launcher Activity + WebView

### 6.1 `android-shell/app/src/main/AndroidManifest.xml`
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"/>

    <application android:label="Nova" android:allowBackup="false">
        <activity
            android:name=".LauncherActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/Theme.Nova.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.HOME"/>
                <category android:name="android.intent.category.DEFAULT"/>
            </intent-filter>
        </activity>

        <service
            android:name=".service.NovaAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="false">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService"/>
            </intent-filter>
            <meta-data android:name="android.accessibilityservice"
                       android:resource="@xml/accessibility_service_config"/>
        </service>

        <service android:name=".service.NovaDaemonService" android:foregroundServiceType="dataSync"/>
    </application>
</manifest>
```
The `HOME` + `DEFAULT` category pair is what makes this a real launcher — this cannot be achieved from a web app, which is why a native Activity is required regardless of framework choice.

### 6.2 `LauncherActivity.kt` — hosts the existing React build unmodified
```kotlin
package com.novalauncher.cluster

import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity

class LauncherActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        // React build output, bundled as an Android asset — same dist/ as desktop-shell uses
        webView.loadUrl("file:///android_asset/frontend/index.html")

        // Expose bridge for RPC to native (nonce/HMAC signing done in JS via WebCrypto, same as bridgeProtocol.ts)
        webView.addJavascriptInterface(NovaAgentClient(this), "NovaNative")
    }

    override fun onBackPressed() {
        // Launcher activities should not be closable via back — override to no-op or go home
    }
}
```

Copy the Vite production build into the Android asset pipeline:
```bash
cd frontend
npm run build
cp -r dist/* ../android-shell/app/src/main/assets/frontend/
```

### 6.3 Battery optimization exemption (required — Doze/HyperOS will kill background daemons otherwise)
Add to `LauncherActivity.onCreate`:
```kotlin
val pm = getSystemService(POWER_SERVICE) as android.os.PowerManager
if (!pm.isIgnoringBatteryOptimizations(packageName)) {
    startActivity(android.content.Intent(
        android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        android.net.Uri.parse("package:$packageName")
    ))
}
```
On MIUI/HyperOS specifically, also direct the user once to Settings → Apps → Autostart, and Battery Saver → No restrictions — there is no programmatic API for this on MIUI; document it as a manual first-run step.

### 6.4 `NovaDaemonService` — now an outbound tailnet client, not a listening server
```kotlin
package com.novalauncher.cluster.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import okhttp3.*

class NovaDaemonService : Service() {
    private val client = OkHttpClient()
    private var socket: WebSocket? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val hubHost = intent?.getStringExtra("hubHost") ?: "nova-desktop.tailXXXX.ts.net"
        val request = Request.Builder().url("wss://$hubHost:8890/ws").build()
        socket = client.newWebSocket(request, NovaSocketListener())
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    inner class NovaSocketListener : WebSocketListener() {
        override fun onMessage(webSocket: WebSocket, text: String) {
            // parse RpcMessage, verify HMAC (Section 2), dispatch to
            // NovaAccessibilityService.instance for LOCK/BACK/HOME actions,
            // or ClipboardManager for SET_CLIPBOARD, mirroring agent-go/rpc.go's dispatch()
        }
    }
}
```

Keep `NovaAccessibilityService.kt` exactly as in the original spec (Section 5.2 of the prior doc) — it's unaffected by this migration.

---

## 7. Pairing Flow (replaces old 6-digit secret system)

1. On the Go agent's first run, print a QR code (or raw hex) encoding the generated `nova-shared.key`.
2. Android app scans it via camera (or manual paste) → stores in `EncryptedSharedPreferences`.
3. Desktop Tauri app reads the same key from `~/.nova/shared.key` (already present since it's the same machine running the agent) — no scan needed for the local desktop UI talking to its own local agent; scanning is only for cross-device (phone ↔ desktop) pairing.

```bash
# generate + print QR (one-time helper script)
openssl rand -hex 32 | tee ~/.nova/shared.key | qrencode -t ansiutf8
```

---

## 8. Migration Checklist (execution order)

1. [ ] `agent-go/`: implement `main.go`, `rpc.go`, `auth.go`, `agent_windows.go`, `agent_linux.go`; build both binaries; verify `wscat` connects and rejects bad signatures.
2. [ ] Delete `nova-agent.ps1` and `server.mjs` — fully superseded.
3. [ ] Rewrite `frontend/src/utils/bridgeProtocol.ts` per Section 4; update all call sites from old `.send()`/callback style to `await client.call(...)`.
4. [ ] Scaffold `desktop-shell/` with Tauri; wire `tauri.conf.json` per Section 5.2; implement tray + global shortcut in `main.rs`.
5. [ ] Scaffold `android-shell/`; implement `LauncherActivity`, manifest `HOME` intent filter, asset-bundled WebView load.
6. [ ] Port `NovaAccessibilityService.kt` unchanged; rewrite `NovaDaemonService.kt` as outbound WS client.
7. [ ] Remove `connect-cluster-adb.sh` and `RegisterNovaProtocol.reg` — superseded by Tailscale + native shells respectively.
8. [ ] Run end-to-end: Go agent on desktop ↔ Tauri UI (localhost) ↔ Android launcher (tailnet) — verify `GET_PROCESSES`, `KILL_PROCESS`, clipboard sync all pass HMAC verification and reject tampered payloads.
9. [ ] Document manual MIUI/HyperOS battery-exemption steps in user-facing onboarding (no API exists for this).

---

## 9. What Explicitly Does NOT Change

- `src/context/LauncherContext.tsx` — state shape unchanged.
- `src/types/launcher.ts` — data models unchanged (RPC action names preserved: `GET_PROCESSES`, `KILL_PROCESS`, `SET_CLIPBOARD`, etc.).
- `src/utils/audio.ts` — Web Audio synth unaffected, runs identically inside Tauri webview and Android WebView.
- All `src/components/apps/*.tsx` — UI/logic unchanged; only the imported bridge client changes shape (Promise-based `call()` instead of raw `.send()`).
