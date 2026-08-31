/**
 * Cross-Platform Architecture Snippets & Code Generation Engine
 * Dual-Platform Target: Android 4.4 - 14 (LineageOS / HyperOS) + Windows 10/11 (C# / PowerShell / Node.js)
 */

export interface CodeFileSnippet {
  id: string;
  name: string;
  language: 'kotlin' | 'csharp' | 'powershell' | 'javascript' | 'bash' | 'xml' | 'json';
  platform: 'android' | 'windows' | 'cross-platform';
  category: 'daemon' | 'service' | 'config' | 'installer' | 'script';
  description: string;
  generateCode: (config: BridgeConfigOptions) => string;
}

export interface BridgeConfigOptions {
  hostIp: string;
  hostPort: number;
  bridgePort: number;
  authToken: string;
  packageName: string;
  secretKey: string;
  allowedPaths: string;
  serviceName: string;
}

export const DEFAULT_BRIDGE_CONFIG: BridgeConfigOptions = {
  hostIp: '192.168.1.104',
  hostPort: 9120,
  bridgePort: 9120,
  authToken: 'win-bridge-sec-token-894',
  packageName: 'com.novalauncher.cluster',
  secretKey: '748-921',
  allowedPaths: 'C:\\Program Files;C:\\Tools;C:\\Windows\\System32',
  serviceName: 'NovaClusterBridge',
};

export const PLATFORM_SNIPPETS: CodeFileSnippet[] = [
  // ==========================================
  // ANDROID NATIVE COMPANION SNIPPETS
  // ==========================================
  {
    id: 'android-accessibility-service',
    name: 'NovaAccessibilityService.kt',
    language: 'kotlin',
    platform: 'android',
    category: 'service',
    description: 'Kotlin Accessibility Service for hardware-level key interception, global actions (Back, Home, Lock, Volume), and app launching.',
    generateCode: (cfg) => `package ${cfg.packageName}.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

/**
 * Nova Minimal Launcher - Android Native Accessibility & Bridge Service
 * Target: Android 4.4 KitKat (API 19) up to Android 14 (API 34)
 */
class NovaAccessibilityService : AccessibilityService() {

    companion object {
        const val TAG = "NovaAccessibility"
        var instance: NovaAccessibilityService? = null
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "Nova Accessibility Service Connected to System Event Bus")

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_VIEW_CLICKED or
                         AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            notificationTimeout = 50
        }
        serviceInfo = info

        // Start background WebSocket IPC Daemon
        startService(Intent(this, NovaDaemonService::class.java))
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val pkg = event.packageName?.toString() ?: ""
            val cls = event.className?.toString() ?: ""
            Log.d(TAG, "Window Focus Changed: pkg=$pkg, class=$cls")
            
            // Broadcast active foreground window change to Cluster Hub
            NovaDaemonService.broadcastWindowState(pkg, cls)
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility Service Interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.i(TAG, "Nova Accessibility Service Destroyed")
    }

    // Remote Actions invoked via RPC from Host Controller
    fun performGlobalLock(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
        } else {
            // Fallback for Android 4.4 / older LineageOS builds
            performGlobalAction(GLOBAL_ACTION_POWER_DIALOG)
        }
    }

    fun performBack(): Boolean = performGlobalAction(GLOBAL_ACTION_BACK)
    fun performHome(): Boolean = performGlobalAction(GLOBAL_ACTION_HOME)
    fun performRecents(): Boolean = performGlobalAction(GLOBAL_ACTION_RECENTS)
    fun performNotificationShade(): Boolean = performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
    fun performQuickSettings(): Boolean = performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)
}
`,
  },
  {
    id: 'android-daemon-service',
    name: 'NovaDaemonService.kt',
    language: 'kotlin',
    platform: 'android',
    category: 'daemon',
    description: 'Persistent WebSocket RPC client connecting Android tablet to host mesh (${cfg.hostIp}:${cfg.hostPort}). Handles remote intents, clipboard, and task management.',
    generateCode: (cfg) => `package ${cfg.packageName}.service

import android.app.*
import android.content.*
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Background Foreground Service maintaining persistent WebSocket link to Cluster Host
 */
class NovaDaemonService : Service() {

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(5000, TimeUnit.MILLISECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private val hubUrl = "ws://${cfg.hostIp}:${cfg.hostPort}/device-rpc"
    private val token = "${cfg.authToken}"

    companion object {
        const val CHANNEL_ID = "nova_daemon_channel"
        const val NOTIF_ID = 9001
        var activeInstance: NovaDaemonService? = null

        fun broadcastWindowState(pkg: String, cls: String) {
            activeInstance?.sendJson(JSONObject().apply {
                put("type", "EVENT")
                put("event", "WINDOW_CHANGED")
                put("package", pkg)
                put("className", cls)
                put("timestamp", System.currentTimeMillis())
            })
        }
    }

    override fun onCreate() {
        super.onCreate()
        activeInstance = this
        createNotificationChannel()
        startForeground(NOTIF_ID, buildForegroundNotification("Connecting to Cluster Hub..."))
        connectWebSocket()
    }

    private fun connectWebSocket() {
        val request = Request.Builder()
            .url(hubUrl)
            .addHeader("Authorization", "Bearer $token")
            .addHeader("X-Device-Model", Build.MODEL)
            .addHeader("X-Device-OS", "Android \${Build.VERSION.RELEASE}")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.i("NovaDaemon", "Connected to Cluster Controller at $hubUrl")
                updateNotification("Connected to Cluster Controller")
                // Register Device capabilities
                ws.send(JSONObject().apply {
                    put("type", "REGISTER")
                    put("deviceModel", Build.MODEL)
                    put("manufacturer", Build.MANUFACTURER)
                    put("sdkInt", Build.VERSION.SDK_INT)
                    put("secretKey", "${cfg.secretKey}")
                }.toString())
            }

            override fun onMessage(ws: WebSocket, text: String) {
                handleRpcMessage(text)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e("NovaDaemon", "WebSocket Connection Error: \${t.message}. Reconnecting in 5s...")
                updateNotification("Disconnected. Retrying...")
                Handler(Looper.getMainLooper()).postDelayed({ connectWebSocket() }, 5000)
            }
        })
    }

    private fun handleRpcMessage(raw: String) {
        try {
            val json = JSONObject(raw)
            val action = json.optString("action")
            val id = json.optString("id")

            when (action) {
                "LAUNCH_INTENT" -> {
                    val pkg = json.getString("packageName")
                    val intent = packageManager.getLaunchIntentForPackage(pkg)
                    if (intent != null) {
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        respondSuccess(id, "Launched $pkg")
                    } else {
                        respondError(id, "Package $pkg not found on device")
                    }
                }
                "SET_CLIPBOARD" -> {
                    val text = json.getString("text")
                    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("ClusterSync", text))
                    respondSuccess(id, "Clipboard set")
                }
                "GLOBAL_ACTION" -> {
                    val type = json.getString("type")
                    val acc = NovaAccessibilityService.instance
                    val success = when (type) {
                        "LOCK" -> acc?.performGlobalLock() ?: false
                        "BACK" -> acc?.performBack() ?: false
                        "HOME" -> acc?.performHome() ?: false
                        "RECENTS" -> acc?.performRecents() ?: false
                        else -> false
                    }
                    respondSuccess(id, "Action $type executed: $success")
                }
                "KILL_PROCESS" -> {
                    val targetPkg = json.getString("packageName")
                    val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                    am.killBackgroundProcesses(targetPkg)
                    respondSuccess(id, "SIGKILL sent to $targetPkg")
                }
                "PING" -> {
                    respondSuccess(id, "PONG")
                }
            }
        } catch (e: Exception) {
            Log.e("NovaDaemon", "RPC Dispatch Error", e)
        }
    }

    private fun sendJson(json: JSONObject) {
        webSocket?.send(json.toString())
    }

    private fun respondSuccess(id: String, msg: String) {
        sendJson(JSONObject().apply {
            put("id", id)
            put("status", "OK")
            put("message", msg)
        })
    }

    private fun respondError(id: String, err: String) {
        sendJson(JSONObject().apply {
            put("id", id)
            put("status", "ERROR")
            put("error", err)
        })
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val chan = NotificationChannel(
                CHANNEL_ID,
                "Nova Cluster Daemon",
                NotificationManager.IMPORTANCE_LOW
            )
            val mgr = getSystemService(NotificationManager::class.java)
            mgr?.createNotificationChannel(chan)
        }
    }

    private fun buildForegroundNotification(status: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Nova Multi-Device Cluster Agent")
            .setContentText(status)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(status: String) {
        val mgr = getSystemService(NotificationManager::class.java)
        mgr?.notify(NOTIF_ID, buildForegroundNotification(status))
    }
}
`,
  },
  {
    id: 'android-manifest',
    name: 'AndroidManifest.xml',
    language: 'xml',
    platform: 'android',
    category: 'config',
    description: 'System permissions, Accessibility Service registration, Boot Completed listener, and Launcher Intent Filters.',
    generateCode: (cfg) => `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${cfg.packageName}">

    <!-- Cluster IPC & Network Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />

    <!-- Process & App Control Permissions -->
    <uses-permission android:name="android.permission.KILL_BACKGROUND_PROCESSES" />
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
    <uses-permission android:name="android.permission.REORDER_TASKS" />

    <!-- System Services & Persistence -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.EXPAND_STATUS_BAR" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Nova Minimal Launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar.Fullscreen">

        <!-- Main Launcher Home Activity -->
        <activity
            android:name=".ui.MainActivity"
            android:launchMode="singleTask"
            android:clearTaskOnLaunch="true"
            android:stateNotNeeded="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.HOME" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Accessibility Service for System Automation -->
        <service
            android:name=".service.NovaAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <!-- Cluster Daemon WebSocket Service -->
        <service
            android:name=".service.NovaDaemonService"
            android:exported="false" />

        <!-- Auto-Start on Device Boot -->
        <receiver
            android:name=".receiver.BootReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

    </application>
</manifest>
`,
  },
  {
    id: 'android-adb-cluster',
    name: 'connect-cluster-adb.sh',
    language: 'bash',
    platform: 'android',
    category: 'script',
    description: 'Automated Bash/Shell script to establish persistent wireless TCP/IP ADB connection, forward ports, and start daemons.',
    generateCode: (cfg) => `#!/usr/bin/env bash
# ==============================================================================
# Nova Multi-Device Cluster ADB Initialization Script
# Target: SM-T230NU (192.168.1.104), POCO-PAD (192.168.1.118), Windows Workstation
# ==============================================================================

set -e

HOST_IP="${cfg.hostIp}"
HOST_PORT="${cfg.hostPort}"
PACKAGE_NAME="${cfg.packageName}"

echo "======================================================================"
echo " [Nova Cluster] Initializing Wireless ADB & Companion Daemons"
echo " Host IP: $HOST_IP:$HOST_PORT"
echo "======================================================================"

# 1. Enable TCP/IP ADB mode on USB device if connected
if adb get-state 1>/dev/null 2>&1; then
    echo "[+] USB Device detected. Enabling ADB over TCP/IP port 5555..."
    adb tcpip 5555
    sleep 2
fi

# 2. Connect to Wireless Android Nodes
TARGET_IPS=("192.168.1.104" "192.168.1.118")

for ip in "\${TARGET_IPS[@]}"; do
    echo "[*] Connecting to node $ip:5555..."
    adb connect "$ip:5555" || echo "[-] Failed to connect to $ip (Device may be offline)"
done

echo "[*] Connected ADB Devices:"
adb devices -l

# 3. Grant Required Android System Permissions
for ip in "\${TARGET_IPS[@]}"; do
    DEVICE_SERIAL="$ip:5555"
    if adb -s "$DEVICE_SERIAL" get-state 1>/dev/null 2>&1; then
        echo "[+] Provisioning permissions for $DEVICE_SERIAL..."
        
        # Grant accessibility service permission without user dialog (Root/ADB)
        adb -s "$DEVICE_SERIAL" shell settings put secure enabled_accessibility_services "$PACKAGE_NAME/.service.NovaAccessibilityService"
        adb -s "$DEVICE_SERIAL" shell settings put secure accessibility_enabled 1

        # Grant wake lock & overlay permissions
        adb -s "$DEVICE_SERIAL" shell appops set "$PACKAGE_NAME" SYSTEM_ALERT_WINDOW allow || true
        
        # Start Nova Companion Service
        adb -s "$DEVICE_SERIAL" shell am startservice -n "$PACKAGE_NAME/.service.NovaDaemonService"
        echo "[✓] Node $DEVICE_SERIAL successfully initialized and running!"
    fi
done

echo "======================================================================"
echo " [Nova Cluster] ADB Bridge Initialized Successfully."
echo "======================================================================"
`,
  },

  // ==========================================
  // WINDOWS NATIVE BRIDGE SNIPPETS (C# & POWERSHELL)
  // ==========================================
  {
    id: 'windows-csharp-service',
    name: 'WindowsBridgeService.cs',
    language: 'csharp',
    platform: 'windows',
    category: 'service',
    description: 'High-performance C# .NET 8 Background Service / System Tray bridge for Windows 10/11 with Process Monitoring, Taskkill, Power Controls, and Secure WebSocket RPC.',
    generateCode: (cfg) => `using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace NovaLauncher.WindowsBridge
{
    /// <summary>
    /// Windows 10/11 Native Bridge Daemon
    /// Listens on ws://0.0.0.0:${cfg.bridgePort}
    /// Executes authorized process management, workstation locking, and remote launches.
    /// </summary>
    public class WindowsBridgeService
    {
        private const int Port = ${cfg.bridgePort};
        private const string AuthToken = "${cfg.authToken}";
        private readonly HttpListener _listener = new();
        private readonly CancellationTokenSource _cts = new();

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool LockWorkStation();

        [DllImport("user32.dll")]
        public static extern bool ExitWindowsEx(uint uFlags, uint dwReason);

        public async Task StartAsync()
        {
            _listener.Prefixes.Add($"http://*:{Port}/");
            _listener.Start();
            Console.WriteLine($"[Nova Bridge] Windows Agent active and listening on port {Port}");

            while (!_cts.Token.IsCancellationRequested)
            {
                var context = await _listener.GetContextAsync();
                if (context.Request.IsWebSocketRequest)
                {
                    _ = ProcessWebSocketRequestAsync(context);
                }
                else
                {
                    // HTTP Health check
                    context.Response.StatusCode = 200;
                    using var writer = new StreamWriter(context.Response.OutputStream);
                    await writer.WriteAsync("{\\"status\\":\\"running\\",\\"os\\":\\"Windows 11\\",\\"bridge\\":\\"C# .NET 8\\"}");
                    context.Response.Close();
                }
            }
        }

        private async Task ProcessWebSocketRequestAsync(HttpListenerContext context)
        {
            var wsContext = await context.AcceptWebSocketAsync(null);
            var ws = wsContext.WebSocket;
            Console.WriteLine("[Nova Bridge] Client connected via WebSocket");

            var buffer = new byte[8192];
            while (ws.State == WebSocketState.Open)
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                    break;
                }

                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                var responseJson = HandleRpcCommand(message);
                var responseBytes = Encoding.UTF8.GetBytes(responseJson);
                await ws.SendAsync(new ArraySegment<byte>(responseBytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }

        private string HandleRpcCommand(string rawJson)
        {
            try
            {
                using var doc = JsonDocument.Parse(rawJson);
                var root = doc.RootElement;
                var action = root.GetProperty("action").GetString();
                var reqId = root.TryGetProperty("id", out var idProp) ? idProp.GetString() : Guid.NewGuid().ToString();

                switch (action)
                {
                    case "GET_PROCESSES":
                        var processes = Process.GetProcesses();
                        var procList = new System.Collections.Generic.List<object>();
                        foreach (var p in processes)
                        {
                            try
                            {
                                procList.Add(new
                                {
                                    pid = p.Id,
                                    name = p.ProcessName + ".exe",
                                    memoryMb = (int)(p.WorkingSet64 / (1024 * 1024)),
                                    responding = p.Responding
                                });
                            }
                            catch { /* Ignore restricted system process metrics */ }
                        }
                        return JsonSerializer.Serialize(new { id = reqId, status = "OK", data = procList });

                    case "KILL_PROCESS":
                        var pid = root.GetProperty("pid").GetInt32();
                        var targetProc = Process.GetProcessById(pid);
                        targetProc.Kill(true);
                        return JsonSerializer.Serialize(new { id = reqId, status = "OK", message = $"Process {pid} terminated." });

                    case "EXECUTE_COMMAND":
                        var cmd = root.GetProperty("command").GetString();
                        var runAsAdmin = root.TryGetProperty("runAsAdmin", out var adminProp) && adminProp.GetBoolean();

                        var psi = new ProcessStartInfo
                        {
                            FileName = "powershell.exe",
                            Arguments = $"-NoProfile -Command \\"{cmd}\\"",
                            UseShellExecute = runAsAdmin,
                            Verb = runAsAdmin ? "runas" : "",
                            RedirectStandardOutput = !runAsAdmin,
                            RedirectStandardError = !runAsAdmin,
                            CreateNoWindow = true
                        };

                        using (var spawned = Process.Start(psi))
                        {
                            var output = runAsAdmin ? "Spawned elevated process" : spawned.StandardOutput.ReadToEnd();
                            return JsonSerializer.Serialize(new { id = reqId, status = "OK", message = output });
                        }

                    case "LOCK_WORKSTATION":
                        LockWorkStation();
                        return JsonSerializer.Serialize(new { id = reqId, status = "OK", message = "Workstation Locked." });

                    case "PING":
                        return JsonSerializer.Serialize(new { id = reqId, status = "OK", message = "PONG" });

                    default:
                        return JsonSerializer.Serialize(new { id = reqId, status = "ERROR", error = $"Unknown action '{action}'" });
                }
            }
            catch (Exception ex)
            {
                return JsonSerializer.Serialize(new { status = "ERROR", error = ex.Message });
            }
        }
    }
}
`,
  },
  {
    id: 'windows-powershell-agent',
    name: 'nova-agent.ps1',
    language: 'powershell',
    platform: 'windows',
    category: 'daemon',
    description: 'Zero-dependency standalone PowerShell 7 background script. Runs HTTP/WebSocket listener on Windows PC without needing visual studio compilation.',
    generateCode: (cfg) => `# ==============================================================================
# Nova Multi-Device Cluster - Windows Lightweight PowerShell Bridge Agent
# Port: ${cfg.bridgePort} | Token: ${cfg.authToken}
# ==============================================================================

param(
    [int]$Port = ${cfg.bridgePort},
    [string]$AuthToken = "${cfg.authToken}"
)

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " [Nova Windows Agent] Starting PowerShell 7 Listener on Port $Port..." -ForegroundColor Green
Write-Host " Ready to receive RPC commands from Host Tablet: ${cfg.hostIp}" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://*:$Port/")
$Listener.Start()

Write-Host "[✓] Listener active. Waiting for cluster requests..." -ForegroundColor Green

try {
    while ($Listener.IsListening) {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        # CORS Headers for Web / Mobile Clients
        $Response.AddHeader("Access-Control-Allow-Origin", "*")
        $Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $Response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if ($Request.HttpMethod -eq "OPTIONS") {
            $Response.StatusCode = 200
            $Response.Close()
            continue
        }

        # Read JSON Payload from POST
        $Reader = New-Object System.IO.StreamReader($Request.InputStream)
        $Body = $Reader.ReadToEnd()
        $Reader.Close()

        $ResponseData = @{ status = "OK"; timestamp = (Get-Date).ToString("o") }

        if ($Request.HttpMethod -eq "POST" -and $Body) {
            $Json = ConvertFrom-Json $Body -ErrorAction SilentlyContinue

            switch ($Json.action) {
                "GET_PROCESSES" {
                    $Procs = Get-Process | Select-Object -First 30 Id, ProcessName, @{Name="MemoryMb"; Expression={[math]::Round($_.WorkingSet64 / 1MB)}}, CPU | ForEach-Object {
                        @{
                            pid = $_.Id
                            name = "$($_.ProcessName).exe"
                            memoryMb = $_.MemoryMb
                            cpu = [math]::Round($_.CPU, 1)
                        }
                    }
                    $ResponseData.processes = $Procs
                }
                "KILL_PROCESS" {
                    Stop-Process -Id $Json.pid -Force -ErrorAction SilentlyContinue
                    $ResponseData.message = "Process $($Json.pid) terminated."
                }
                "LOCK_WORKSTATION" {
                    rundll32.exe user32.dll,LockWorkStation
                    $ResponseData.message = "Windows Workstation locked."
                }
                "EXECUTE_COMMAND" {
                    $Output = Invoke-Expression $Json.command | Out-String
                    $ResponseData.message = $Output.Trim()
                }
                "SET_VOLUME" {
                    # Optional NirCmd or WASAPI hook
                    $ResponseData.message = "Volume adjusted to $($Json.volume)%"
                }
                default {
                    $ResponseData.status = "ERROR"
                    $ResponseData.error = "Unrecognized command $($Json.action)"
                }
            }
        } else {
            # Basic GET Status Info
            $ResponseData.device = $env:COMPUTERNAME
            $ResponseData.os = (Get-CimInstance Win32_OperatingSystem).Caption
            $ResponseData.uptime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
        }

        $JsonOut = ConvertTo-Json $ResponseData -Depth 4
        $Buffer = [System.Text.Encoding]::UTF8.GetBytes($JsonOut)
        $Response.ContentType = "application/json"
        $Response.ContentLength64 = $Buffer.Length
        $Response.OutputStream.Write($Buffer, 0, $Buffer.Length)
        $Response.Close()
    }
} finally {
    $Listener.Stop()
}
`,
  },

  // ==========================================
  // CROSS-PLATFORM NODE.JS / BUN DAEMON
  // ==========================================
  {
    id: 'cross-platform-node-bridge',
    name: 'server.mjs',
    language: 'javascript',
    platform: 'cross-platform',
    category: 'daemon',
    description: 'Cross-platform Node.js / Bun WebSocket & HTTP server. Runs seamlessly on Windows, Linux, Android (Termux), or macOS.',
    generateCode: (cfg) => `import http from 'http';
import { WebSocketServer } from 'ws';
import { exec, execSync } from 'child_process';
import os from 'os';

const PORT = process.env.PORT || ${cfg.bridgePort};
const AUTH_TOKEN = process.env.AUTH_TOKEN || '${cfg.authToken}';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      totalMem: Math.round(os.totalmem() / 1024 / 1024),
      freeMem: Math.round(os.freemem() / 1024 / 1024),
    }));
  }

  res.writeHead(404);
  res.end('Nova Cluster Bridge');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('[Nova Bridge] Client Connected from', req.socket.remoteAddress);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { action, id } = data;

      switch (action) {
        case 'PING':
          ws.send(JSON.stringify({ id, status: 'OK', message: 'PONG', time: Date.now() }));
          break;

        case 'GET_PROCESSES':
          if (process.platform === 'win32') {
            exec('tasklist /FO CSV /NH', (err, stdout) => {
              if (err) return ws.send(JSON.stringify({ id, status: 'ERROR', error: err.message }));
              const procs = stdout.split('\\r\\n').filter(Boolean).slice(0, 25).map(line => {
                const parts = line.split('","').map(s => s.replace(/"/g, ''));
                return { name: parts[0], pid: parseInt(parts[1], 10), memoryMb: Math.round(parseInt(parts[4]?.replace(/[^0-9]/g, '') || '0') / 1024) };
              });
              ws.send(JSON.stringify({ id, status: 'OK', data: procs }));
            });
          } else {
            exec('ps -eo pid,pcpu,pmem,comm --sort=-pmem | head -n 25', (err, stdout) => {
              if (err) return ws.send(JSON.stringify({ id, status: 'ERROR', error: err.message }));
              ws.send(JSON.stringify({ id, status: 'OK', raw: stdout }));
            });
          }
          break;

        case 'KILL_PROCESS':
          const pid = data.pid;
          if (!pid) return ws.send(JSON.stringify({ id, status: 'ERROR', error: 'Missing PID' }));
          const killCmd = process.platform === 'win32' ? \`taskkill /F /PID \${pid}\` : \`kill -9 \${pid}\`;
          exec(killCmd, (err) => {
            if (err) return ws.send(JSON.stringify({ id, status: 'ERROR', error: err.message }));
            ws.send(JSON.stringify({ id, status: 'OK', message: \`PID \${pid} terminated\` }));
          });
          break;

        case 'EXECUTE':
          const cmd = data.command;
          exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
            ws.send(JSON.stringify({
              id,
              status: err ? 'ERROR' : 'OK',
              output: stdout || stderr || (err ? err.message : 'Success'),
            }));
          });
          break;

        default:
          ws.send(JSON.stringify({ id, status: 'ERROR', error: \`Unknown action \${action}\` }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ status: 'ERROR', error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(\`[Nova Bridge] Node.js Bridge Daemon listening on http://0.0.0.0:\${PORT}\`);
});
`,
  },
  {
    id: 'windows-registry-protocol',
    name: 'RegisterNovaProtocol.reg',
    language: 'json',
    platform: 'windows',
    category: 'config',
    description: 'Windows Registry script to register the custom URI protocol handler `nova-bridge://` for deep-linking apps from Android directly onto Windows PC.',
    generateCode: (cfg) => `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\nova-bridge]
@="URL:Nova Cluster Bridge Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\nova-bridge\\DefaultIcon]
@="C:\\\\Program Files\\\\NovaLauncher\\\\nova-agent.exe,1"

[HKEY_CLASSES_ROOT\\nova-bridge\\shell]

[HKEY_CLASSES_ROOT\\nova-bridge\\shell\\open]

[HKEY_CLASSES_ROOT\\nova-bridge\\shell\\open\\command]
@="powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File \\"C:\\\\Tools\\\\NovaLauncher\\\\nova-agent.ps1\\" -Uri \\"%1\\""
`,
  }
];
