package com.nodus.fleet.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.nodus.common.NodusIpcContract
import com.nodus.fleet.net.HttpRpcClient
import com.nodus.fleet.net.UdpDiscoveryManager
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * Foreground Daemon Service managing mesh topology, UDP discovery,
 * real-time telemetry polling, and RPC execution for Nodus Fleet.
 */
class FleetDaemonService : Service() {

    companion object {
        private const val TAG = "FleetDaemonService"
        private const val NOTIFICATION_ID = 1002
        private const val CHANNEL_ID = "nodus_fleet_daemon"
        private const val TELEMETRY_POLL_INTERVAL_MS = 4000L
        private const val DEVICE_TIMEOUT_MS = 30000L

        @Volatile
        var instance: FleetDaemonService? = null
            private set
    }

    private val connectedDevices = ConcurrentHashMap<String, JSONObject>()
    private val discoveredPeers = ConcurrentHashMap<String, JSONObject>()
    private val httpRpcClient = HttpRpcClient()
    private var udpDiscoveryManager: UdpDiscoveryManager? = null
    private var httpServer: com.nodus.fleet.net.FleetHttpServer? = null

    private val mainHandler = Handler(Looper.getMainLooper())
    private var telemetryRunnable: Runnable? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                buildNotification("Nodus Fleet Mesh Active"),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
            )
        } else {
            startForeground(NOTIFICATION_ID, buildNotification("Nodus Fleet Mesh Active"))
        }

        // Register local tablet node
        registerLocalDevice()
        loadSavedPairedDevices()

        // Start Embedded HTTP Server on Port 9120 for companion status & RPC
        httpServer = com.nodus.fleet.net.FleetHttpServer(this, 9120).apply {
            start()
        }

        // Start UDP Discovery Engine (Populates discoveredPeers for pairing modal, does NOT auto-connect un-paired peers)
        udpDiscoveryManager = UdpDiscoveryManager(this) { discoveredDevice ->
            val id = discoveredDevice.optString("id")
            val ip = discoveredDevice.optString("ipAddress").split(":")[0].trim()
            if (id.isNotEmpty() && id != "poco-pad") {
                discoveredPeers[id] = discoveredDevice

                // Match connected devices by ID or by clean IP address
                var matchedKey: String? = null
                if (connectedDevices.containsKey(id)) {
                    matchedKey = id
                } else if (ip.isNotEmpty()) {
                    for ((k, dev) in connectedDevices) {
                        if (k != "poco-pad") {
                            val devIp = dev.optString("ipAddress").split(":")[0].trim()
                            if (devIp == ip) {
                                matchedKey = k
                                break
                            }
                        }
                    }
                }

                if (matchedKey != null) {
                    val existing = connectedDevices[matchedKey]
                    if (existing != null) {
                        existing.put("cpuLoad", discoveredDevice.optInt("cpuLoad", existing.optInt("cpuLoad", 10)))
                        existing.put("ramUsage", discoveredDevice.optString("ramUsage", existing.optString("ramUsage", "Active")))
                        existing.put("battery", discoveredDevice.optInt("battery", existing.optInt("battery", 100)))
                        existing.put("status", "connected")
                        existing.put("lastSeen", System.currentTimeMillis())
                        notifyStateChanged()
                    }
                }
            }
        }.apply {
            start()
        }

        // Start background telemetry polling loop
        startTelemetryLoop()

        Log.i(TAG, "FleetDaemonService initialized and discovery active")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun getLocalWifiIp(): String {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                if (iface.isLoopback || !iface.isUp) continue
                val addrs = iface.inetAddresses
                while (addrs.hasMoreElements()) {
                    val addr = addrs.nextElement()
                    if (addr is java.net.Inet4Address && !addr.isLoopbackAddress) {
                        return addr.hostAddress ?: "127.0.0.1"
                    }
                }
            }
        } catch (_: Exception) {}
        return "127.0.0.1"
    }

    private fun registerLocalDevice() {
        val dm = resources.displayMetrics
        val realIp = getLocalWifiIp()
        val localDevice = JSONObject().apply {
            put("id", "poco-pad")
            put("name", "POCO Pad")
            put("type", "tablet")
            put("os", "android")
            put("status", "online")
            put("ipAddress", realIp)
            put("resolution", "${dm.widthPixels}x${dm.heightPixels}")
            put("battery", 85)
            put("cpuLoad", 12)
            put("ramUsage", "3.4 / 8.0 GB")
            put("storage", "42 / 128 GB")
            put("isLocal", true)
            put("lastSeen", System.currentTimeMillis())
        }
        connectedDevices[localDevice.getString("id")] = localDevice
    }

    fun getDiscoveredPeersJson(): String {
        val array = JSONArray()
        for (peer in discoveredPeers.values) {
            array.put(peer)
        }
        return array.toString()
    }

    fun getDiscoveredPeersCount(): Int {
        return discoveredPeers.size
    }

    fun addOrUpdateRemoteDevice(device: JSONObject) {
        val id = device.optString("id")
        if (id.isEmpty() || id == "poco-pad") return

        val newIp = device.optString("ipAddress").split(":")[0].trim()

        // Deduplicate any existing connected node with the same IP address
        if (newIp.isNotEmpty()) {
            try {
                val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
                val set = prefs.getStringSet("known_companion_ips", mutableSetOf<String>())?.toMutableSet() ?: mutableSetOf<String>()
                set.add(newIp)
                prefs.edit().putStringSet("known_companion_ips", set).apply()
            } catch (_: Exception) {}

            val duplicateKeys = mutableListOf<String>()
            for ((existingId, existingDev) in connectedDevices) {
                if (existingId != "poco-pad" && existingId != id) {
                    val existingIp = existingDev.optString("ipAddress").split(":")[0].trim()
                    if (existingIp == newIp) {
                        duplicateKeys.add(existingId)
                    }
                }
            }
            for (dupKey in duplicateKeys) {
                connectedDevices.remove(dupKey)
            }
        }

        val isNew = !connectedDevices.containsKey(id)
        connectedDevices[id] = device
        savePairedDevices()

        if (isNew) {
            Log.i(TAG, "New peer explicitly paired: ${device.optString("name")} (${device.optString("ipAddress")})")
            val intent = Intent(NodusIpcContract.ACTION_DEVICE_CONNECTED).apply {
                putExtra(NodusIpcContract.EXTRA_DEVICE_JSON, device.toString())
            }
            sendBroadcast(intent, NodusIpcContract.PERMISSION_FLEET_ACCESS)
        }
        notifyStateChanged()
    }

    fun getConnectedDevice(id: String): JSONObject? = connectedDevices[id]

    fun removeRemoteDevice(idOrIp: String) {
        var removed = connectedDevices.remove(idOrIp)
        if (removed == null) {
            val clean = idOrIp.split(":")[0].trim()
            val matchKey = connectedDevices.entries.find { (_, dev) ->
                val devIp = dev.optString("ipAddress").split(":")[0].trim()
                devIp == clean
            }?.key
            if (matchKey != null) {
                removed = connectedDevices.remove(matchKey)
            }
        }
        discoveredPeers.remove(idOrIp)
        savePairedDevices()
        if (removed != null) {
            val ip = removed.optString("ipAddress").split(":")[0].trim()
            val port = removed.optInt("httpPort", removed.optInt("port", 9120))
            val token = removed.optString("authToken", removed.optString("token", "NODUS-FLEET-SECURE"))
            if (ip.isNotEmpty()) {
                try {
                    val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
                    val set = prefs.getStringSet("known_companion_ips", mutableSetOf<String>())?.toMutableSet() ?: mutableSetOf<String>()
                    set.remove(ip)
                    prefs.edit().putStringSet("known_companion_ips", set).apply()
                } catch (_: Exception) {}

                // Send unpair notification to remote peer node
                httpRpcClient.unpairDevice(ip, port, token)
            }
            Log.i(TAG, "Peer disconnected: ${removed.optString("name")}")
            val intent = Intent(NodusIpcContract.ACTION_DEVICE_DISCONNECTED).apply {
                putExtra(NodusIpcContract.EXTRA_DEVICE_JSON, removed.toString())
            }
            sendBroadcast(intent, NodusIpcContract.PERMISSION_FLEET_ACCESS)
            notifyStateChanged()
        }
    }

    fun disconnectAll(reason: String = "server_stopped") {
        val toRemove = mutableListOf<JSONObject>()
        for ((id, dev) in connectedDevices) {
            if (id != "poco-pad" && !dev.optBoolean("isLocal", false)) {
                toRemove.add(dev)
            }
        }

        for (dev in toRemove) {
            val ip = dev.optString("ipAddress").split(":")[0].trim()
            val port = dev.optInt("httpPort", dev.optInt("port", 9120))
            val token = dev.optString("authToken", dev.optString("token", "NODUS-FLEET-SECURE"))
            if (ip.isNotEmpty()) {
                httpRpcClient.unpairDevice(ip, port, token)
            }
        }

        connectedDevices.clear()
        discoveredPeers.clear()
        registerLocalDevice()
        savePairedDevices()
        try {
            val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
            prefs.edit().putStringSet("known_companion_ips", emptySet()).apply()
        } catch (_: Exception) {}

        Log.i(TAG, "All fleet connections disconnected (reason=$reason)")
        notifyStateChanged()
    }

    private fun savePairedDevices() {
        try {
            val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
            val array = JSONArray()
            for ((id, dev) in connectedDevices) {
                if (id != "poco-pad" && !dev.optBoolean("isLocal", false)) {
                    array.put(dev)
                }
            }
            prefs.edit().putString("paired_devices_json", array.toString()).apply()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to persist paired devices: ${e.message}")
        }
    }

    private fun loadSavedPairedDevices() {
        try {
            val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
            val jsonStr = prefs.getString("paired_devices_json", null)
            if (!jsonStr.isNullOrBlank()) {
                val array = JSONArray(jsonStr)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val id = obj.optString("id")
                    if (id.isNotEmpty() && id != "poco-pad") {
                        connectedDevices[id] = obj
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load saved paired devices: ${e.message}")
        }
    }

    fun isValidAuthToken(tokenCandidate: String): Boolean {
        if (tokenCandidate.isBlank()) return false
        if (tokenCandidate == "NODUS-FLEET-SECURE") return true
        val candidateBytes = tokenCandidate.toByteArray(Charsets.UTF_8)
        for ((_, dev) in connectedDevices) {
            val token = dev.optString("authToken", dev.optString("token", ""))
            if (token.isNotBlank()) {
                val tokenBytes = token.toByteArray(Charsets.UTF_8)
                if (tokenBytes.size == candidateBytes.size && java.security.MessageDigest.isEqual(tokenBytes, candidateBytes)) {
                    return true
                }
            }
        }
        return false
    }

    fun getTokenForHost(host: String): String? {
        val cleanHost = host.split(":")[0].trim()
        for ((_, dev) in connectedDevices) {
            val devIp = dev.optString("ipAddress", dev.optString("ip", "")).split(":")[0].trim()
            if (devIp == cleanHost) {
                val token = dev.optString("authToken", dev.optString("token", ""))
                if (token.isNotBlank()) return token
            }
        }
        return "NODUS-FLEET-SECURE"
    }

    private fun startTelemetryLoop() {
        telemetryRunnable = object : Runnable {
            override fun run() {
                pollConnectedNodes()
                pruneStaleDevices()
                mainHandler.postDelayed(this, TELEMETRY_POLL_INTERVAL_MS)
            }
        }
        mainHandler.postDelayed(telemetryRunnable!!, TELEMETRY_POLL_INTERVAL_MS)
    }

    private fun pollConnectedNodes() {
        for ((id, dev) in connectedDevices) {
            if (dev.optBoolean("isLocal", false)) continue

            val ip = dev.optString("ipAddress")
            val port = dev.optInt("httpPort", dev.optInt("port", 9120))
            if (ip.isEmpty()) continue

            val token = dev.optString("authToken", dev.optString("token", "NODUS-FLEET-SECURE"))
            httpRpcClient.fetchStats(ip, port, token,
                onSuccess = { stats ->
                    val cpu = stats.optInt("cpuLoad", stats.optInt("cpu", dev.optInt("cpuLoad", 15)))
                    val ram = stats.optString("ramUsage", dev.optString("ramUsage", "Active"))
                    val battery = stats.optInt("battery", dev.optInt("battery", 100))
                    val realName = stats.optString("name", stats.optString("hostname", ""))
                    if (realName.isNotBlank()) {
                        dev.put("name", realName)
                    }

                    dev.put("cpuLoad", cpu)
                    dev.put("ramUsage", ram)
                    dev.put("battery", battery)
                    val wasOffline = dev.optString("status") != "connected"
                    dev.put("status", "connected")
                    dev.put("lastSeen", System.currentTimeMillis())

                    connectedDevices[id] = dev
                    if (wasOffline) {
                        notifyStateChanged()
                    }
                },
                onError = {
                    // Node did not respond to this poll
                }
            )
        }
    }

    private fun pruneStaleDevices() {
        val now = System.currentTimeMillis()
        var stateChanged = false

        for ((_, dev) in connectedDevices) {
            if (dev.optBoolean("isLocal", false)) continue
            val lastSeen = dev.optLong("lastSeen", now)
            if (now - lastSeen > DEVICE_TIMEOUT_MS) {
                if (dev.optString("status") != "offline") {
                    dev.put("status", "offline")
                    stateChanged = true
                }
            }
        }

        if (stateChanged) {
            notifyStateChanged()
        }
    }

    fun notifyStateChanged() {
        val intent = Intent(NodusIpcContract.ACTION_FLEET_STATE_CHANGED)
        sendBroadcast(intent, NodusIpcContract.PERMISSION_FLEET_ACCESS)
        com.nodus.fleet.FleetActivity.instance?.evaluateJs("window.dispatchEvent(new CustomEvent('fleet-state-changed'));")
    }

    fun getDevicesJson(): String {
        val array = JSONArray()
        val seenIps = mutableSetOf<String>()
        for (device in connectedDevices.values) {
            val ip = device.optString("ipAddress").split(":")[0].trim()
            if (ip.isNotEmpty()) seenIps.add(ip)
            array.put(device)
        }
        return array.toString()
    }

    fun getConfigJson(): String {
        return JSONObject().apply {
            put("role", "host")
            put("serverPort", UdpDiscoveryManager.DISCOVERY_PORT)
            put("serverHost", "0.0.0.0")
            put("serverStatus", "running")
            put("connectedCount", connectedDevices.size)
        }.toString()
    }

    // ─── Remote Actions Gateway ─────────────────────────────────────────────

    fun executeRemoteShortcut(deviceId: String, commandOrId: String, callback: (Boolean) -> Unit = {}) {
        val dev = connectedDevices[deviceId] ?: return callback(false)
        val ip = dev.optString("ipAddress")
        val port = dev.optInt("httpPort", dev.optInt("port", 9120))

        httpRpcClient.executeShortcut(ip, port, commandOrId,
            onSuccess = { callback(true) },
            onError = { callback(false) }
        )
    }

    fun killRemoteProcess(deviceId: String, pid: Int, callback: (Boolean) -> Unit = {}) {
        val dev = connectedDevices[deviceId] ?: return callback(false)
        val ip = dev.optString("ipAddress")
        val port = dev.optInt("httpPort", dev.optInt("port", 9120))

        httpRpcClient.killProcess(ip, port, pid,
            onSuccess = { callback(true) },
            onError = { callback(false) }
        )
    }

    fun sendRemoteSystemControl(deviceId: String, action: String, callback: (Boolean) -> Unit = {}) {
        val dev = connectedDevices[deviceId] ?: return callback(false)
        val ip = dev.optString("ipAddress")
        val port = dev.optInt("httpPort", dev.optInt("port", 9120))

        httpRpcClient.sendSystemControl(ip, port, action,
            onSuccess = { callback(true) },
            onError = { callback(false) }
        )
    }

    fun broadcastClipboardToPeers(text: String, imageData: String? = null) {
        val targets = mutableSetOf<Pair<String, Int>>()

        val resolveIp: (JSONObject) -> String = { dev ->
            val raw = if (dev.has("ipAddress") && dev.optString("ipAddress").isNotBlank()) {
                dev.optString("ipAddress")
            } else if (dev.has("ip") && dev.optString("ip").isNotBlank()) {
                dev.optString("ip")
            } else {
                ""
            }
            raw.removePrefix("http://").removePrefix("https://").substringBefore(":").trim()
        }

        for ((_, dev) in connectedDevices) {
            if (dev.optBoolean("isLocal", false)) continue
            val rawIp = resolveIp(dev)
            val port = dev.optInt("httpPort", dev.optInt("port", 9120))
            if (rawIp.isNotEmpty() && rawIp != "127.0.0.1" && rawIp != "localhost" && rawIp != "0.0.0.0") {
                targets.add(Pair(rawIp, port))
            }
        }

        for ((_, dev) in discoveredPeers) {
            if (dev.optBoolean("isLocal", false)) continue
            val rawIp = resolveIp(dev)
            val port = dev.optInt("httpPort", dev.optInt("port", 9120))
            if (rawIp.isNotEmpty() && rawIp != "127.0.0.1" && rawIp != "localhost" && rawIp != "0.0.0.0") {
                targets.add(Pair(rawIp, port))
            }
        }

        try {
            val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
            val jsonStr = prefs.getString("paired_devices_json", null)
            if (!jsonStr.isNullOrBlank()) {
                val array = JSONArray(jsonStr)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val rawIp = resolveIp(obj)
                    val port = obj.optInt("httpPort", obj.optInt("port", 9120))
                    if (rawIp.isNotEmpty() && rawIp != "127.0.0.1" && rawIp != "localhost" && rawIp != "0.0.0.0") {
                        targets.add(Pair(rawIp, port))
                    }
                }
            }
            val knownIps = prefs.getStringSet("known_companion_ips", emptySet<String>()) ?: emptySet<String>()
            for (kIp in knownIps) {
                val clean = kIp.split(":")[0].trim()
                if (clean.isNotEmpty() && clean != "127.0.0.1" && clean != "localhost" && clean != "0.0.0.0") {
                    targets.add(Pair(clean, 9120))
                }
            }
        } catch (_: Exception) {}

        Log.i(TAG, "Broadcasting clipboard snippet to ${targets.size} targets: $targets")
        for ((ip, port) in targets) {
            httpRpcClient.syncClipboard(ip, port, text, imageData)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Nodus Fleet Mesh Daemon",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains connection with companion devices for multi-device sync"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Nodus Fleet")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        disconnectAll("service_destroyed")
        telemetryRunnable?.let { mainHandler.removeCallbacks(it) }
        udpDiscoveryManager?.stop()
        udpDiscoveryManager = null
        httpServer?.stop()
        httpServer = null
        instance = null
        Log.i(TAG, "FleetDaemonService destroyed")
    }
}
