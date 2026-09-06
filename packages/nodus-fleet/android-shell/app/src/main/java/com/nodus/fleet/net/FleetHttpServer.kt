package com.nodus.fleet.net

import android.content.Context
import android.os.Build
import android.util.Log
import com.nodus.fleet.service.ClipboardSyncService
import com.nodus.fleet.service.FleetDaemonService
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
            socket.soTimeout = 3000
            val reader = BufferedReader(InputStreamReader(socket.getInputStream(), Charsets.UTF_8))
            val line = reader.readLine() ?: return
            val parts = line.split(" ")
            if (parts.size < 2) return

            val method = parts[0].uppercase()
            val uri = parts[1]

            // Read headers
            val headers = mutableMapOf<String, String>()
            var headerLine: String?
            var contentLength = 0
            while (reader.readLine().also { headerLine = it } != null) {
                if (headerLine!!.isEmpty()) break
                val colon = headerLine!!.indexOf(":")
                if (colon != -1) {
                    val key = headerLine!!.substring(0, colon).trim().lowercase()
                    val value = headerLine!!.substring(colon + 1).trim()
                    headers[key] = value
                    if (key == "content-length") {
                        contentLength = value.toIntOrNull() ?: 0
                    }
                }
            }

            // Read body if present
            var body = ""
            if (contentLength > 0 && contentLength < 1024 * 1024) {
                val bodyChars = CharArray(contentLength)
                var read = 0
                while (read < contentLength) {
                    val r = reader.read(bodyChars, read, contentLength - read)
                    if (r == -1) break
                    read += r
                }
                body = String(bodyChars, 0, read)
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
                            val clipObj = JSONObject(body)
                            val text = clipObj.optString("content", clipObj.optString("text", ""))
                            val source = clipObj.optString("sourceDevice", "desktop")
                            if (text.isNotBlank()) {
                                ClipboardSyncService.instance?.addAndSync(text, source, isFromLocalDevice = false)
                            }
                            responseBytes = "{\"ok\":true}".toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        } catch (e: Exception) {
                            statusCode = 400
                            responseBytes = "{\"error\":\"Invalid JSON\"}".toByteArray(Charsets.UTF_8)
                            contentType = "application/json; charset=utf-8"
                        }
                    } else {
                        statusCode = 405
                        responseBytes = "{\"error\":\"Method not allowed\"}".toByteArray(Charsets.UTF_8)
                        contentType = "application/json; charset=utf-8"
                    }
                }

                uri.startsWith("/api/devices") -> {
                    val devices = FleetDaemonService.instance?.getDevicesJson() ?: "[]"
                    responseBytes = devices.toByteArray(Charsets.UTF_8)
                    contentType = "application/json; charset=utf-8"
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
            val header = "HTTP/1.1 $statusCode OK\r\n" +
                    "Content-Type: $contentType\r\n" +
                    "Content-Length: ${responseBytes.size}\r\n" +
                    "Access-Control-Allow-Origin: *\r\n" +
                    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
                    "Access-Control-Allow-Headers: *\r\n" +
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
