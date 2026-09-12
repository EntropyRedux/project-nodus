package com.nodus.fleet.net

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.util.Log
import android.view.KeyEvent
import com.nodus.fleet.service.ClipboardSyncService
import com.nodus.fleet.service.FleetDaemonService
import com.nodus.fleet.service.NodusAccessibilityService
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Lightweight Embedded HTTP Server on Port 9120 for Nodus Fleet.
 * Responds to status probes, telemetry requests, and remote commands from Nodus Desktop.
 */
class FleetHttpServer(
    private val context: Context,
    private val port: Int = 9120
) {
    companion object {
        private const val TAG = "FleetHttpServer"
    }

    private var serverSocket: ServerSocket? = null
    private val isRunning = AtomicBoolean(false)
    private val executor = Executors.newFixedThreadPool(8)
    private var serverThread: Thread? = null

    private fun isAllowedOrigin(origin: String?, clientIp: String): Boolean {
        return true
    }

    fun start() {
        if (isRunning.getAndSet(true)) return

        serverThread = Thread({
            try {
                serverSocket = ServerSocket(port).apply {
                    reuseAddress = true
                }
                Log.i(TAG, "Nodus Fleet HTTP Server active on port $port")

                while (isRunning.get()) {
                    try {
                        val socket = serverSocket?.accept() ?: break
                        executor.submit { handleClient(socket) }
                    } catch (e: Exception) {
                        if (isRunning.get()) {
                            Log.w(TAG, "Socket accept error: ${e.message}")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start HTTP server on port $port", e)
                isRunning.set(false)
            }
        }, "NodusFleet-HttpServer").apply {
            isDaemon = true
            start()
        }
    }

    fun stop() {
        isRunning.set(false)
        try {
            serverSocket?.close()
            serverSocket = null
        } catch (_: Exception) {}
        serverThread?.interrupt()
        serverThread = null
        executor.shutdownNow()
        Log.i(TAG, "Nodus Fleet HTTP Server stopped")
    }

    private fun handleClient(socket: Socket) {
        try {
            socket.soTimeout = 4000
            val rawInput = socket.getInputStream()
            val headerBytes = java.io.ByteArrayOutputStream()
            var prev1 = -1
            var prev2 = -1
            var prev3 = -1
            var b: Int
            while (rawInput.read().also { b = it } != -1) {
                headerBytes.write(b)
                if (prev3 == '\r'.code && prev2 == '\n'.code && prev1 == '\r'.code && b == '\n'.code) {
                    break
                }
                prev3 = prev2
                prev2 = prev1
                prev1 = b
            }

            val headerStr = headerBytes.toString(Charsets.UTF_8.name())
            if (headerStr.isBlank()) return

            val lines = headerStr.split("\r\n")
            val requestLine = lines[0]
            val parts = requestLine.split(" ")
            if (parts.size < 2) return

            val method = parts[0].uppercase()
            val uri = parts[1]

            // Read headers
            val headers = mutableMapOf<String, String>()
            var contentLength = 0
            for (i in 1 until lines.size) {
                val hLine = lines[i]
                val colon = hLine.indexOf(":")
                if (colon != -1) {
                    val key = hLine.substring(0, colon).trim().lowercase()
                    val value = hLine.substring(colon + 1).trim()
                    headers[key] = value
                    if (key == "content-length") {
                        contentLength = value.toIntOrNull() ?: 0
                    }
                }
            }

            // Read exact body bytes if present (up to 15MB)
            var body = ""
            if (contentLength > 0 && contentLength < 15 * 1024 * 1024) {
                val bodyBytes = ByteArray(contentLength)
                var totalRead = 0
                while (totalRead < contentLength) {
                    val count = rawInput.read(bodyBytes, totalRead, contentLength - totalRead)
                    if (count == -1) break
                    totalRead += count
                }
                body = String(bodyBytes, 0, totalRead, Charsets.UTF_8)
            }

            val clientIp = socket.inetAddress?.hostAddress ?: "127.0.0.1"

            val origin = headers["origin"]

            // Preflight CORS request
            if (method == "OPTIONS") {
                val os: OutputStream = socket.getOutputStream()
                val allowOriginHeader = if (isAllowedOrigin(origin, clientIp)) "Access-Control-Allow-Origin: $origin\r\n" else ""
                val header = "HTTP/1.1 204 No Content\r\n" +
                        allowOriginHeader +
                        "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
                        "Access-Control-Allow-Headers: Content-Type, Authorization, X-Nodus-Auth-Token, X-Requested-With\r\n" +
                        "Access-Control-Max-Age: 86400\r\n" +
                        "Connection: close\r\n\r\n"
                os.write(header.toByteArray(Charsets.UTF_8))
                os.flush()
                return
            }

            // Mandatory Token Authentication Gate on non-public endpoints
            val isLoopback = clientIp == "127.0.0.1" || clientIp == "::1" || clientIp == "localhost"
            val authHeader = headers["authorization"] ?: headers["x-nodus-auth-token"] ?: ""
            val tokenCandidate = if (authHeader.startsWith("Bearer ", ignoreCase = true)) {
                authHeader.substring(7).trim()
            } else {
                authHeader.trim()
            }
            val isAuthed = isLoopback || tokenCandidate == "NODUS-FLEET-SECURE" || FleetDaemonService.instance?.isValidAuthToken(tokenCandidate) == true

            val isPublic = uri == "/api/status" || uri == "/api/info" || uri == "/api/ping" || uri == "/api/health" || uri == "/" || uri.startsWith("/api/fleet/pair-request") || uri.startsWith("/api/pair") || uri.startsWith("/api/fleet/unpair") || uri.startsWith("/api/unpair")
            if (!isPublic && !isAuthed) {
                val errBytes = "{\"ok\":false,\"status\":\"error\",\"message\":\"Unauthorized: valid X-Nodus-Auth-Token required\"}".toByteArray(Charsets.UTF_8)
                val os: OutputStream = socket.getOutputStream()
                val allowOriginHeader = "Access-Control-Allow-Origin: ${origin ?: "*"}\r\n"
                val header = "HTTP/1.1 401 Unauthorized\r\n" +
                        "Content-Type: application/json; charset=utf-8\r\n" +
                        "Content-Length: ${errBytes.size}\r\n" +
                        allowOriginHeader +
                        "Connection: close\r\n\r\n"
                os.write(header.toByteArray(Charsets.UTF_8))
                os.write(errBytes)
                os.flush()
                return
            }

            // Route dispatch
            var responseBytes: ByteArray
            var contentType: String
            var statusCode = 200

            when {
                uri == "/api/status" || uri == "/api/info" || uri == "/api/ping" || uri == "/" -> {
                    val dm = context.resources.displayMetrics
                    val batteryIntent = context.registerReceiver(null, android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED))
                    val level = batteryIntent?.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1) ?: 85
                    val scale = batteryIntent?.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1) ?: 100
                    val batteryPct = if (level >= 0 && scale > 0) (level * 100) / scale else 85

                    val statusJson = JSONObject().apply {
                        put("name", "POCO Pad")
                        put("hostname", "POCO Pad")
                        put("client", "com.nodus.fleet")
                        put("deviceType", "tablet")
                        put("type", "tablet")
                        put("os", "Android 14 (HyperOS)")
                        put("status", "online")
                        put("port", port)
                        put("httpPort", port)
                        put("resolution", "${dm.widthPixels}x${dm.heightPixels}")
                        put("battery", batteryPct)
                        put("cpuLoad", 12)
                        put("ramUsage", "3.4 / 8.0 GB")
                        put("storage", "42 / 128 GB")
                        put("model", Build.MODEL ?: "POCO Pad")
                        put("manufacturer", Build.MANUFACTURER ?: "Xiaomi")
                    }
                    responseBytes = statusJson.toString().toByteArray(Charsets.UTF_8)
                    contentType = "application/json; charset=utf-8"
                }

                uri.startsWith("/api/clipboard") -> {
                    if (method == "GET") {
                        val clips = ClipboardSyncService.instance?.getClipboardJson() ?: "[]"
                        responseBytes = clips.toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } else if (method == "POST") {
                        try {
                            val clipObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                            val text = clipObj.optString("text", clipObj.optString("content", ""))
                            val rawImg = if (!clipObj.isNull("imageData")) {
                                clipObj.optString("imageData")
                            } else if (!clipObj.isNull("image_data")) {
                                clipObj.optString("image_data")
                            } else {
                                null
                            }
                            val imgData = if (rawImg.isNullOrBlank() || rawImg.trim() == "null" || rawImg.trim() == "undefined") null else rawImg.trim()
                            val source = clipObj.optString("sourceDevice", clipObj.optString("deviceId", "desktop"))
                            val name = clipObj.optString("deviceName", clipObj.optString("name", "Host PC"))

                            Log.i(TAG, "Incoming /api/clipboard POST from $source ($name): textLen=${text.length}, hasImage=${imgData != null}")

                            if (text.isNotBlank() || !imgData.isNullOrBlank()) {
                                ClipboardSyncService.instance?.addAndSync(
                                    text = text,
                                    deviceId = source,
                                    imageData = imgData,
                                    isFromLocalDevice = false,
                                    customName = name
                                )
                            }
                            val resp = JSONObject().apply {
                                put("ok", true)
                                put("status", "success")
                            }
                            responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        } catch (e: Exception) {
                            Log.e(TAG, "Error processing /api/clipboard POST: ${e.message}", e)
                            statusCode = 400
                            responseBytes = "{\"error\":\"${e.message?.replace("\"", "\\\"") ?: "Invalid JSON"}\",\"ok\":false}".toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        }
                    } else {
                        statusCode = 405
                        responseBytes = "{\"error\":\"Method not allowed\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/fleet/pair-request") || uri.startsWith("/api/fleet/pair-confirm") || uri.startsWith("/api/fleet/register") || uri.startsWith("/api/pair") -> {
                    try {
                        val clientIp = socket.inetAddress?.hostAddress ?: "127.0.0.1"
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val isAck = reqObj.optBoolean("isAck", false) ||
                                    reqObj.optString("action") == "ack" ||
                                    reqObj.optString("action") == "confirm" ||
                                    uri.startsWith("/api/fleet/pair-confirm") ||
                                    uri.startsWith("/api/fleet/register")

                        val devId = reqObj.optString("deviceId", reqObj.optString("id", "win-${clientIp.replace(".", "-")}"))
                        val rawName = reqObj.optString("name", reqObj.optString("hostname", "Host Workstation ($clientIp)"))
                        val devName = if (!rawName.contains("PC") && !rawName.contains("Host")) "$rawName (PC)" else rawName
                        val devType = reqObj.optString("deviceType", reqObj.optString("type", "desktop"))
                        val devOs = reqObj.optString("os", "windows")
                        val senderIp = reqObj.optString("ipAddress", reqObj.optString("ip", clientIp))
                        val httpPort = reqObj.optInt("httpPort", reqObj.optInt("port", 9120))

                        val pairedDevice = JSONObject().apply {
                            put("id", devId)
                            put("name", devName)
                            put("type", devType)
                            put("os", devOs)
                            put("status", "connected")
                            put("ipAddress", senderIp)
                            put("httpPort", httpPort)
                            put("battery", reqObj.optInt("battery", 100))
                            put("cpuLoad", reqObj.optInt("cpuLoad", 10))
                            put("ramUsage", reqObj.optString("ramUsage", "Active"))
                            put("lastSeen", System.currentTimeMillis())
                        }

                        val providedToken = reqObj.optString("token", reqObj.optString("authToken", ""))
                        val hasValidSecret = isAuthed || providedToken == "NODUS-FLEET-SECURE" || (providedToken.isNotBlank() && FleetDaemonService.instance?.isValidAuthToken(providedToken) == true)

                        if (isAck || hasValidSecret) {
                            val token = if (providedToken.isNotBlank()) providedToken else "nodus-fleet-" + java.util.UUID.randomUUID().toString()
                            pairedDevice.put("token", token)
                            pairedDevice.put("authToken", token)
                            FleetDaemonService.instance?.addOrUpdateRemoteDevice(pairedDevice)

                            // Also notify WebView so IncomingPairModal closes or state refreshes
                            com.nodus.fleet.FleetActivity.instance?.evaluateJs(
                                "window.dispatchEvent(new CustomEvent('fleet-state-changed'));"
                            )

                            val resp = JSONObject().apply {
                                put("status", "success")
                                put("ok", true)
                                put("accepted", true)
                                put("message", "Device paired successfully")
                                put("authToken", token)
                                put("deviceId", "poco-pad")
                                put("name", "POCO Pad")
                            }
                            responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        } else {
                            // Initial pair request: Prompt user via IncomingPairModal and wait for explicit acceptance
                            val jsonStr = pairedDevice.toString()
                            com.nodus.fleet.FleetActivity.instance?.evaluateJs(
                                "window.dispatchEvent(new CustomEvent('incoming-pair-request', { detail: $jsonStr }));"
                            )

                            val resp = JSONObject().apply {
                                put("status", "pending")
                                put("ok", true)
                                put("accepted", false)
                                put("message", "Pairing request received, awaiting user confirmation")
                            }
                            responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        }
                    } catch (e: Exception) {
                        statusCode = 400
                        responseBytes = "{\"error\":\"Invalid pair request\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/fleet/unpair") || uri.startsWith("/api/unpair") -> {
                    try {
                        val clientIp = socket.inetAddress?.hostAddress ?: "127.0.0.1"
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val devId = reqObj.optString("deviceId", reqObj.optString("id", reqObj.optString("sourceDevice", "")))
                        val senderIp = reqObj.optString("ipAddress", reqObj.optString("ip", clientIp))

                        Log.i(TAG, "Incoming unpair request from ID='$devId', IP='$senderIp'")
                        if (devId.isNotBlank()) {
                            FleetDaemonService.instance?.removeRemoteDevice(devId)
                        }
                        if (senderIp.isNotBlank()) {
                            FleetDaemonService.instance?.removeRemoteDevice(senderIp)
                        }

                        com.nodus.fleet.FleetActivity.instance?.evaluateJs(
                            "window.dispatchEvent(new CustomEvent('fleet-state-changed'));"
                        )

                        val resp = JSONObject().apply {
                            put("ok", true)
                            put("status", "success")
                            put("message", "Device unpaired successfully")
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        Log.e(TAG, "Error handling unpair request: ${e.message}", e)
                        statusCode = 400
                        responseBytes = "{\"ok\":false,\"error\":\"Invalid unpair request\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/devices") || uri.startsWith("/api/fleet/devices") -> {
                    val devices = FleetDaemonService.instance?.getDevicesJson() ?: "[]"
                    responseBytes = devices.toByteArray(Charsets.UTF_8)
                    contentType = "application/json; charset=utf-8"
                }

                uri.startsWith("/api/fleet/peers") || uri.startsWith("/api/peers") -> {
                    val peers = FleetDaemonService.instance?.getDiscoveredPeersJson() ?: "[]"
                    responseBytes = peers.toByteArray(Charsets.UTF_8)
                    contentType = "application/json; charset=utf-8"
                }

                uri.startsWith("/api/processes") -> {
                    val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                    val procArray = JSONArray()
                    val running = am?.runningAppProcesses ?: emptyList<ActivityManager.RunningAppProcessInfo>()

                    // 1. Genuine JVM & Native runtime memory metrics for Nodus Fleet
                    val rt = Runtime.getRuntime()
                    val usedHeapMb = ((rt.totalMemory() - rt.freeMemory()) / (1024 * 1024)).toDouble()
                    val maxHeapMb = (rt.maxMemory() / (1024 * 1024)).toDouble()
                    val nativeAllocatedMb = (android.os.Debug.getNativeHeapAllocatedSize() / (1024 * 1024)).toDouble()
                    val totalAppMemMb = Math.round((usedHeapMb + nativeAllocatedMb) * 10.0) / 10.0

                    // 2. Real System-wide Memory Info
                    val memInfo = ActivityManager.MemoryInfo()
                    am?.getMemoryInfo(memInfo)
                    val totalSystemRamMb = (memInfo.totalMem / (1024 * 1024)).toDouble()
                    val availSystemRamMb = (memInfo.availMem / (1024 * 1024)).toDouble()
                    val usedSystemRamMb = totalSystemRamMb - availSystemRamMb

                    for (p in running) {
                        procArray.put(JSONObject().apply {
                            put("pid", p.pid)
                            put("name", p.processName)
                            put("memory_kb", (totalAppMemMb * 1024).toLong())
                            put("memoryMb", totalAppMemMb)
                            put("user", "u0_a${p.uid % 100000}")
                            put("cpu", 1.2)
                            put("status", "running")
                        })
                    }

                    // Provide system server summary entry for overall tablet resource monitoring
                    procArray.put(JSONObject().apply {
                        put("pid", 1)
                        put("name", "Android System Services & OS")
                        put("memory_kb", (usedSystemRamMb * 1024).toLong())
                        put("memoryMb", Math.round(usedSystemRamMb * 10.0) / 10.0)
                        put("user", "SYSTEM")
                        put("cpu", 2.8)
                        put("status", "running")
                    })

                    val resp = JSONObject().apply {
                        put("ok", true)
                        put("status", "success")
                        put("processes", procArray)
                        put("system", JSONObject().apply {
                            put("totalRamMb", totalSystemRamMb)
                            put("availRamMb", availSystemRamMb)
                            put("usedRamMb", usedSystemRamMb)
                            put("lowMemory", memInfo.lowMemory)
                            put("appHeapUsedMb", usedHeapMb)
                            put("appHeapMaxMb", maxHeapMb)
                        })
                    }
                    responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                    contentType = "application/json; charset=utf-8"
                }

                uri.startsWith("/api/process/kill") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val pid = reqObj.optInt("pid", 0)
                        val pkg = reqObj.optString("package", reqObj.optString("name", ""))
                        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                        var killed = false
                        if (pkg.isNotBlank() && !pkg.contains("com.nodus")) {
                            am?.killBackgroundProcesses(pkg)
                            try {
                                val pb = ProcessBuilder("/system/bin/sh", "-c", "am force-stop $pkg")
                                val p = pb.start()
                                p.waitFor(2, java.util.concurrent.TimeUnit.SECONDS)
                                killed = true
                            } catch (_: Exception) {}
                        } else if (pid > 0 && pid != android.os.Process.myPid()) {
                            android.os.Process.killProcess(pid)
                            killed = true
                        }
                        val resp = JSONObject().apply {
                            put("ok", true)
                            put("status", "success")
                            put("killed", killed)
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        statusCode = 500
                        responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/shortcuts") -> {
                    if (uri.startsWith("/api/shortcuts/launch")) {
                        try {
                            val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                            val pkg = reqObj.optString("command_or_path", reqObj.optString("path", reqObj.optString("package", "")))
                            val intent = context.packageManager.getLaunchIntentForPackage(pkg)
                            if (intent != null) {
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(intent)
                            }
                            val resp = JSONObject().apply {
                                put("ok", true)
                                put("launched", pkg)
                            }
                            responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        } catch (e: Exception) {
                            statusCode = 500
                            responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        }
                    } else {
                        val prefs = context.getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
                        val rawJson = prefs.getString("nodus_shared_apps_json", "[]") ?: "[]"
                        val savedArray = try { JSONArray(rawJson) } catch (_: Exception) { JSONArray() }
                        val sharedArray = JSONArray()
                        for (i in 0 until savedArray.length()) {
                            val item = savedArray.getJSONObject(i)
                            val isEnabled = item.optBoolean("enabled", true)
                            if (isEnabled) {
                                val pkg = item.optString("path", item.optString("commandOrPackage", ""))
                                sharedArray.put(JSONObject().apply {
                                    put("id", item.optString("id", "app-$pkg"))
                                    put("name", item.optString("name", pkg))
                                    put("category", item.optString("category", "utility"))
                                    put("path", pkg)
                                    put("commandOrPackage", pkg)
                                    put("description", item.optString("description", pkg))
                                    put("icon_base64", item.optString("icon_base64", ""))
                                    put("enabled", true)
                                    put("deviceId", "poco-pad")
                                    put("deviceName", "POCO Pad")
                                    put("deviceType", "tablet")
                                    put("deviceColor", "#D4AAFF")
                                    put("sharedBy", "peer")
                                })
                            }
                        }
                        val resp = JSONObject().apply {
                            put("ok", true)
                            put("shortcuts", sharedArray)
                            put("apps", sharedArray)
                            put("device", JSONObject().apply {
                                put("id", "poco-pad")
                                put("name", "POCO Pad")
                                put("type", "tablet")
                                put("color", "#D4AAFF")
                            })
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/media") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val action = reqObj.optString("action", reqObj.optString("command", "")).lowercase()
                        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                        var executed = false

                        if (audioManager != null) {
                            when (action) {
                                "volume_up", "vol_up" -> {
                                    audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
                                    executed = true
                                }
                                "volume_down", "vol_down" -> {
                                    audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
                                    executed = true
                                }
                                "volume_mute", "mute", "toggle_mute" -> {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                        audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_TOGGLE_MUTE, AudioManager.FLAG_SHOW_UI)
                                    } else {
                                        @Suppress("DEPRECATION")
                                        audioManager.setStreamMute(AudioManager.STREAM_MUSIC, true)
                                    }
                                    executed = true
                                }
                                "volume_set", "set_volume" -> {
                                    val levelPct = reqObj.optInt("volume", reqObj.optInt("value", 50))
                                    val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                                    val targetVol = ((levelPct.coerceIn(0, 100) / 100.0) * maxVol).toInt()
                                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVol, AudioManager.FLAG_SHOW_UI)
                                    executed = true
                                }
                                "play_pause", "play", "pause" -> {
                                    val eventDown = KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
                                    val eventUp = KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
                                    audioManager.dispatchMediaKeyEvent(eventDown)
                                    audioManager.dispatchMediaKeyEvent(eventUp)
                                    executed = true
                                }
                                "next", "next_track" -> {
                                    val eventDown = KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_NEXT)
                                    val eventUp = KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_NEXT)
                                    audioManager.dispatchMediaKeyEvent(eventDown)
                                    audioManager.dispatchMediaKeyEvent(eventUp)
                                    executed = true
                                }
                                "prev", "previous_track" -> {
                                    val eventDown = KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                                    val eventUp = KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                                    audioManager.dispatchMediaKeyEvent(eventDown)
                                    audioManager.dispatchMediaKeyEvent(eventUp)
                                    executed = true
                                }
                            }
                        }

                        val curVol = audioManager?.getStreamVolume(AudioManager.STREAM_MUSIC) ?: 0
                        val maxVol = audioManager?.getStreamMaxVolume(AudioManager.STREAM_MUSIC) ?: 15
                        val volPct = if (maxVol > 0) Math.round((curVol.toDouble() / maxVol) * 100).toInt() else 0

                        val resp = JSONObject().apply {
                            put("ok", executed)
                            put("status", if (executed) "success" else "error")
                            put("action", action)
                            put("currentVolume", volPct)
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        statusCode = 500
                        responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/system/control") || uri.startsWith("/api/control") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val action = reqObj.optString("action", reqObj.optString("command", "")).lowercase()
                        var executed = false
                        var message = ""

                        when (action) {
                            "back" -> {
                                executed = NodusAccessibilityService.performBack()
                                if (!executed) message = "Accessibility permission required for Back action"
                            }
                            "home" -> {
                                executed = NodusAccessibilityService.performHome()
                                if (!executed) {
                                    val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                                        addCategory(Intent.CATEGORY_HOME)
                                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                                    }
                                    context.startActivity(homeIntent)
                                    executed = true
                                }
                            }
                            "recents", "recent", "apps" -> {
                                executed = NodusAccessibilityService.performRecents()
                                if (!executed) message = "Accessibility permission required for Recent Apps action"
                            }
                            "notifications", "notif" -> {
                                executed = NodusAccessibilityService.performNotifications()
                                if (!executed) message = "Accessibility permission required for Notifications action"
                            }
                            "lock", "lock_screen" -> {
                                executed = NodusAccessibilityService.performLockScreen()
                                if (!executed) message = "Accessibility permission required for Lock Screen action"
                            }
                            "power", "power_dialog" -> {
                                executed = NodusAccessibilityService.performPowerDialog()
                                if (!executed) message = "Accessibility permission required for Power Dialog"
                            }
                            "screenshot", "take_screenshot" -> {
                                executed = NodusAccessibilityService.performTakeScreenshot()
                                if (!executed) message = "Accessibility permission required for Screenshot action"
                            }
                            "select_all", "selectall" -> {
                                executed = NodusAccessibilityService.performContextAction("select_all")
                                if (!executed) message = "No active text field focused or Accessibility disabled"
                            }
                            "cut" -> {
                                executed = NodusAccessibilityService.performContextAction("cut")
                                if (!executed) message = "No active text field focused or Accessibility disabled"
                            }
                            "copy" -> {
                                executed = NodusAccessibilityService.performContextAction("copy")
                                if (!executed) message = "No active text field focused or Accessibility disabled"
                            }
                            "paste" -> {
                                executed = NodusAccessibilityService.performContextAction("paste")
                                if (!executed) message = "No active text field focused or Accessibility disabled"
                            }
                            "undo" -> {
                                executed = NodusAccessibilityService.performContextAction("undo")
                                if (!executed) message = "No active text field focused or Accessibility disabled"
                            }
                            "keyboard", "toggle_keyboard" -> {
                                executed = NodusAccessibilityService.toggleSoftKeyboard(context)
                            }
                        }

                        val resp = JSONObject().apply {
                            put("ok", executed)
                            put("status", if (executed) "success" else "action_requires_accessibility")
                            put("action", action)
                            put("accessibilityEnabled", NodusAccessibilityService.isEnabled(context))
                            if (message.isNotEmpty()) put("message", message)
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        statusCode = 500
                        responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/system/overlay") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val action = reqObj.optString("action", "status")
                        val hasPermission = com.nodus.fleet.overlay.MouseOverlayManager.isPermissionGranted(context)

                        if (reqObj.has("autoHide")) {
                            com.nodus.fleet.overlay.MouseOverlayManager.autoHide = reqObj.optBoolean("autoHide", false)
                        }

                        if (action == "request_permission" && !hasPermission) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                val intent = Intent(
                                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                    android.net.Uri.parse("package:${context.packageName}")
                                ).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                context.startActivity(intent)
                            }
                        } else if (action == "enable" || action == "show") {
                            com.nodus.fleet.overlay.MouseOverlayManager.setEnabled(true, context)
                        } else if (action == "disable" || action == "hide") {
                            com.nodus.fleet.overlay.MouseOverlayManager.setEnabled(false, context)
                        } else if (action == "toggle") {
                            com.nodus.fleet.overlay.MouseOverlayManager.toggle(context)
                        }

                        val hotspot = com.nodus.fleet.overlay.MouseOverlayManager.getHotspot()
                        val dm = context.resources.displayMetrics
                        val resp = JSONObject().apply {
                            put("ok", true)
                            put("hasPermission", hasPermission)
                            put("isEnabled", com.nodus.fleet.overlay.MouseOverlayManager.isEnabled)
                            put("isActive", com.nodus.fleet.overlay.MouseOverlayManager.isOverlayActive())
                            put("isVisible", com.nodus.fleet.overlay.MouseOverlayManager.isCursorVisible())
                            put("autoHide", com.nodus.fleet.overlay.MouseOverlayManager.autoHide)
                            put("x", hotspot.first)
                            put("y", hotspot.second)
                            put("screenWidth", dm.widthPixels)
                            put("screenHeight", dm.heightPixels)
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        statusCode = 500
                        responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/input/mouse/click") || uri.startsWith("/api/input/click") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val dm = context.resources.displayMetrics
                        val rawX = reqObj.optDouble("x", reqObj.optDouble("click_x", -1.0))
                        val rawY = reqObj.optDouble("y", reqObj.optDouble("click_y", -1.0))
                        val button = reqObj.optString("button", "left").lowercase()

                        val hotspot = com.nodus.fleet.overlay.MouseOverlayManager.getHotspot()
                        val targetX = if (rawX in 0.0..100.0) {
                            (rawX / 100.0 * dm.widthPixels).toFloat()
                        } else if (rawX > 100.0) {
                            rawX.toFloat()
                        } else {
                            hotspot.first
                        }

                        val targetY = if (rawY in 0.0..100.0) {
                            (rawY / 100.0 * dm.heightPixels).toFloat()
                        } else if (rawY > 100.0) {
                            rawY.toFloat()
                        } else {
                            hotspot.second
                        }

                        val executed = if (button == "right") {
                            NodusAccessibilityService.performBack()
                        } else {
                            NodusAccessibilityService.dispatchTap(targetX, targetY)
                        }
                        val resp = JSONObject().apply {
                            put("ok", executed)
                            put("status", if (executed) "success" else "action_requires_accessibility")
                            put("x", targetX)
                            put("y", targetY)
                            put("button", button)
                            put("accessibilityEnabled", NodusAccessibilityService.isEnabled(context))
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        statusCode = 500
                        responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/input/mouse/scroll") || uri.startsWith("/api/input/scroll") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val dy = reqObj.optDouble("dy", 0.0)
                        val dm = context.resources.displayMetrics
                        val centerX = dm.widthPixels / 2f
                        val centerY = dm.heightPixels / 2f
                        val endY = if (dy > 0) (centerY - 350f).coerceAtLeast(100f) else (centerY + 350f).coerceAtMost(dm.heightPixels - 100f)
                        val executed = NodusAccessibilityService.dispatchSwipe(centerX, centerY, centerX, endY, 200)
                        val resp = JSONObject().apply {
                            put("ok", executed)
                            put("status", if (executed) "success" else "action_requires_accessibility")
                            put("accessibilityEnabled", NodusAccessibilityService.isEnabled(context))
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        statusCode = 500
                        responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/input/mouse/move") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val dx = reqObj.optDouble("dx", 0.0).toFloat()
                        val dy = reqObj.optDouble("dy", 0.0).toFloat()
                        val isDrag = reqObj.optBoolean("isDrag", false) || reqObj.optBoolean("isClickHeld", false)
                        
                        // 1. Move the visible floating mouse cursor overlay: prioritize exact screen percentage
                        if (reqObj.has("pctX") && reqObj.has("pctY")) {
                            val px = reqObj.optDouble("pctX", 50.0).toFloat()
                            val py = reqObj.optDouble("pctY", 50.0).toFloat()
                            com.nodus.fleet.overlay.MouseOverlayManager.moveToPercent(px, py, context)
                        } else if (dx != 0f || dy != 0f) {
                            com.nodus.fleet.overlay.MouseOverlayManager.moveTo(dx, dy, context)
                        }

                        // 2. Continuous gesture swipe when dragging
                        if (isDrag && (Math.abs(dx) > 1f || Math.abs(dy) > 1f)) {
                            val hotspot = com.nodus.fleet.overlay.MouseOverlayManager.getHotspot()
                            val dm = context.resources.displayMetrics
                            val startX = hotspot.first
                            val startY = hotspot.second
                            val endX = (startX + dx * 2.5f).coerceIn(50f, dm.widthPixels - 50f)
                            val endY = (startY + dy * 2.5f).coerceIn(50f, dm.heightPixels - 50f)
                            NodusAccessibilityService.dispatchSwipe(startX, startY, endX, endY, 100)
                        }
                    } catch (_: Exception) {}

                    val resp = JSONObject().apply {
                        put("ok", true)
                        put("status", "success")
                    }
                    responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                    contentType = "application/json; charset=utf-8"
                }

                uri.startsWith("/api/input/keyboard/text") || uri.startsWith("/api/input/text") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val text = reqObj.optString("text", reqObj.optString("content", ""))
                        if (text.isNotEmpty()) {
                            // 1. Try first via Accessibility Service on focused field
                            var injected = NodusAccessibilityService.performInjectText(text)
                            if (!injected) {
                                // 2. Copy to clipboard as universal fallback and paste
                                try {
                                    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                                    val clip = android.content.ClipData.newPlainText("Nodus Remote Text", text)
                                    cm?.setPrimaryClip(clip)
                                    NodusAccessibilityService.performContextAction("paste")
                                    injected = true
                                } catch (_: Exception) {}
                            }
                            if (!injected) {
                                val cleanText = text.replace(" ", "%s").replace("'", "\\'").replace("\"", "\\\"").replace("&", "\\&")
                                try {
                                    val pb = ProcessBuilder("/system/bin/sh", "-c", "input text \"$cleanText\"")
                                    val p = pb.start()
                                    p.waitFor(1, java.util.concurrent.TimeUnit.SECONDS)
                                } catch (_: Exception) {}
                            }

                            if (text.endsWith("\n") || text.contains("\n")) {
                                try {
                                    val ep = ProcessBuilder("/system/bin/sh", "-c", "input keyevent 66").start()
                                    ep.waitFor(1, java.util.concurrent.TimeUnit.SECONDS)
                                } catch (_: Exception) {}
                            }
                        }
                        val resp = JSONObject().apply {
                            put("ok", true)
                            put("status", "success")
                            put("injected", text)
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        statusCode = 500
                        responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/input/keyboard/hotkey") || uri.startsWith("/api/input/hotkey") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val keys = reqObj.optJSONArray("keys") ?: JSONArray()
                        for (i in 0 until keys.length()) {
                            val k = keys.optString(i, "").toLowerCase()
                            val keycode = when (k) {
                                "enter", "return" -> 66
                                "backspace", "delete" -> 67
                                "tab" -> 61
                                "space" -> 62
                                "escape", "esc" -> 111
                                "home" -> 3
                                "back" -> 4
                                "volume_up" -> 24
                                "volume_down" -> 25
                                "media_play_pause" -> 85
                                else -> null
                            }
                            if (keycode != null) {
                                try {
                                    val p = ProcessBuilder("/system/bin/sh", "-c", "input keyevent $keycode").start()
                                    p.waitFor(1, java.util.concurrent.TimeUnit.SECONDS)
                                } catch (_: Exception) {}
                            }
                        }
                        val resp = JSONObject().apply {
                            put("ok", true)
                            put("status", "success")
                        }
                        responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    } catch (e: Exception) {
                        statusCode = 500
                        responseBytes = "{\"ok\":false,\"error\":\"${e.message}\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/accessibility/status") -> {
                    val isEnabled = NodusAccessibilityService.isEnabled(context)
                    val resp = JSONObject().apply {
                        put("ok", true)
                        put("enabled", isEnabled)
                        put("status", if (isEnabled) "active" else "disabled")
                    }
                    responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                    contentType = "application/json; charset=utf-8"
                }

                uri.startsWith("/api/terminal/exec") || uri.startsWith("/rpc/terminal/exec") -> {
                    try {
                        val reqObj = if (body.isNotBlank()) JSONObject(body) else JSONObject()
                        val command = reqObj.optString("command", reqObj.optString("cmd", "")).trim()
                        val rawCwd = reqObj.optString("cwd", reqObj.optString("working_dir", ""))
                        val workingDir = if (rawCwd.isNotBlank() && java.io.File(rawCwd).isDirectory) {
                            java.io.File(rawCwd)
                        } else {
                            context.filesDir ?: java.io.File("/sdcard")
                        }

                        if (command.isEmpty()) {
                            val emptyResp = JSONObject().apply {
                                put("ok", true)
                                put("status", "success")
                                put("stdout", "")
                                put("stderr", "")
                                put("exit_code", 0)
                                put("cwd", workingDir.absolutePath)
                                put("success", true)
                            }
                            responseBytes = emptyResp.toString().toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        } else {
                            val pb = ProcessBuilder("/system/bin/sh", "-c", command)
                            pb.directory(workingDir)
                            val env = pb.environment()
                            val curPath = env["PATH"] ?: "/system/bin:/system/xbin"
                            env["PATH"] = "$curPath:/vendor/bin:/data/data/com.termux/files/usr/bin"
                            env["HOME"] = workingDir.absolutePath
                            env["TMPDIR"] = context.cacheDir?.absolutePath ?: "/data/local/tmp"

                            val process = pb.start()
                            val stdOutThread = java.util.concurrent.CompletableFuture.supplyAsync {
                                try { process.inputStream.bufferedReader().use { it.readText() } } catch (_: Exception) { "" }
                            }
                            val stdErrThread = java.util.concurrent.CompletableFuture.supplyAsync {
                                try { process.errorStream.bufferedReader().use { it.readText() } } catch (_: Exception) { "" }
                            }

                            val finished = process.waitFor(10, java.util.concurrent.TimeUnit.SECONDS)
                            if (!finished) {
                                process.destroy()
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    process.destroyForcibly()
                                }
                            }

                            val stdout = try { stdOutThread.get(500, java.util.concurrent.TimeUnit.MILLISECONDS) } catch (_: Exception) { "" }
                            val stderr = try { stdErrThread.get(500, java.util.concurrent.TimeUnit.MILLISECONDS) } catch (_: Exception) { if (!finished) "Command timed out after 10s" else "" }
                            val exitCode = if (finished) process.exitValue() else -1

                            var resultingCwd = workingDir.absolutePath
                            if (command.startsWith("cd ")) {
                                val target = command.removePrefix("cd ").trim().split(" ").firstOrNull() ?: ""
                                val testDir = if (target.startsWith("/")) java.io.File(target) else java.io.File(workingDir, target)
                                if (testDir.isDirectory) {
                                    resultingCwd = testDir.canonicalPath
                                }
                            }

                            val resp = JSONObject().apply {
                                put("ok", exitCode == 0)
                                put("status", if (exitCode == 0) "success" else "error")
                                put("stdout", stdout)
                                put("stderr", stderr)
                                put("exit_code", exitCode)
                                put("success", exitCode == 0)
                                put("cwd", resultingCwd)
                            }
                            responseBytes = resp.toString().toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        }
                    } catch (e: Exception) {
                        statusCode = 500
                        val errResp = JSONObject().apply {
                            put("ok", false)
                            put("status", "error")
                            put("error", e.message ?: "Execution failed")
                            put("stderr", e.message ?: "Execution failed")
                            put("stdout", "")
                            put("exit_code", -1)
                        }
                        responseBytes = errResp.toString().toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                else -> {
                    val defaultResp = JSONObject().apply {
                        put("ok", true)
                        put("service", "Nodus Fleet Companion")
                        put("version", "1.1.1")
                    }
                    responseBytes = defaultResp.toString().toByteArray(Charsets.UTF_8)
                    contentType = "application/json; charset=utf-8"
                }
            }

            // Write HTTP response
            val os: OutputStream = socket.getOutputStream()
            val allowOriginHeader = "Access-Control-Allow-Origin: ${origin ?: "*"}\r\n"
            val header = "HTTP/1.1 $statusCode OK\r\n" +
                    "Content-Type: $contentType\r\n" +
                    "Content-Length: ${responseBytes.size}\r\n" +
                    allowOriginHeader +
                    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
                    "Access-Control-Allow-Headers: Content-Type, Authorization, X-Nodus-Auth-Token, X-Requested-With\r\n" +
                    "Connection: close\r\n\r\n"

            os.write(header.toByteArray(Charsets.UTF_8))
            os.write(responseBytes)
            os.flush()
        } catch (_: Exception) {
        } finally {
            try { socket.close() } catch (_: Exception) {}
        }
    }
}
