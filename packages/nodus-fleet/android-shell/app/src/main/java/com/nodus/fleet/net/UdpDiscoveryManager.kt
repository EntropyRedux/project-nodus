package com.nodus.fleet.net

import android.content.Context
import android.net.wifi.WifiManager
import android.util.Log
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.atomic.AtomicBoolean

/**
 * UDP Broadcast & Discovery Engine for Nodus Fleet.
 * Periodically broadcasts discovery beacons across the LAN and listens for
 * responses from companion devices (e.g. PCControlSuite on Windows, other Nodus tablets).
 */
class UdpDiscoveryManager(
    private val context: Context,
    private val onDeviceDiscovered: (JSONObject) -> Unit
) {

    companion object {
        private const val TAG = "UdpDiscoveryManager"
        const val DISCOVERY_PORT = 8765
        const val COMPANION_PORT = 8080
        private const val BEACON_INTERVAL_MS = 5000L
    }

    private var multicastLock: WifiManager.MulticastLock? = null
    private var socket: DatagramSocket? = null
    private val isRunning = AtomicBoolean(false)
    private var listenerThread: Thread? = null
    private var beaconThread: Thread? = null

    fun start() {
        if (isRunning.getAndSet(true)) return

        acquireMulticastLock()

        try {
            socket = DatagramSocket(DISCOVERY_PORT).apply {
                broadcast = true
                reuseAddress = true
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not bind to port $DISCOVERY_PORT, binding to wildcard port: ${e.message}")
            try {
                socket = DatagramSocket().apply {
                    broadcast = true
                }
            } catch (e2: Exception) {
                Log.e(TAG, "Fatal: failed to create UDP socket", e2)
                isRunning.set(false)
                return
            }
        }

        startListener()
        startBeaconSender()
        Log.i(TAG, "UDP Discovery Manager started on port ${socket?.localPort}")
    }

    fun stop() {
        isRunning.set(false)
        try {
            socket?.close()
            socket = null
        } catch (e: Exception) {
            Log.w(TAG, "Error closing UDP socket: ${e.message}")
        }

        listenerThread?.interrupt()
        listenerThread = null

        beaconThread?.interrupt()
        beaconThread = null

        releaseMulticastLock()
        Log.i(TAG, "UDP Discovery Manager stopped")
    }

    private fun startListener() {
        listenerThread = Thread({
            val buffer = ByteArray(4096)
            while (isRunning.get()) {
                try {
                    val currentSocket = socket ?: break
                    val packet = DatagramPacket(buffer, buffer.size)
                    currentSocket.receive(packet)

                    val senderIp = packet.address.hostAddress ?: continue
                    val payload = String(packet.data, 0, packet.length).trim()

                    if (payload.isNotEmpty() && payload.startsWith("{") && payload.endsWith("}")) {
                        handleIncomingPacket(payload, senderIp)
                    }
                } catch (e: Exception) {
                    if (isRunning.get()) {
                        Log.w(TAG, "UDP receive error: ${e.message}")
                    }
                }
            }
        }, "NodusFleet-UdpListener").apply {
            isDaemon = true
            start()
        }
    }

    private fun handleIncomingPacket(rawJson: String, senderIp: String) {
        try {
            val obj = JSONObject(rawJson)
            val type = obj.optString("type")

            // Ignore our own discovery requests
            if (type == "NODUS_DISCOVER_REQ" && obj.optString("client") == "com.nodus.fleet") {
                return
            }

            // Detect PCControlMaster response format
            val isPcControl = obj.has("role") || (obj.has("port") && obj.has("name") && !obj.has("type"))
            val rawName = obj.optString("name", obj.optString("hostname", "Node ($senderIp)"))
            val deviceId = obj.optString("id", if (isPcControl) "win-${senderIp.replace(".", "-")}" else rawName.lowercase().replace(" ", "-"))
            val deviceName = if (isPcControl && !rawName.contains("PC") && !rawName.contains("Desktop")) "$rawName (PC)" else rawName
            val deviceType = if (isPcControl) "desktop" else obj.optString("deviceType", obj.optString("type", "desktop")).lowercase()
            val deviceOs = if (isPcControl) "windows" else obj.optString("os", "windows").lowercase()
            val httpPort = obj.optInt("port", obj.optInt("httpPort", COMPANION_PORT))

            val device = JSONObject().apply {
                put("id", deviceId)
                put("name", deviceName)
                put("type", if (deviceType.contains("phone")) "phone" else if (deviceType.contains("laptop")) "laptop" else if (deviceType.contains("tablet")) "tablet" else "desktop")
                put("os", deviceOs)
                put("status", "online")
                put("ipAddress", senderIp)
                put("httpPort", httpPort)
                put("battery", obj.optInt("battery", 100))
                put("cpuLoad", obj.optInt("cpuLoad", obj.optInt("cpu", 10)))
                put("ramUsage", obj.optString("ramUsage", "Active"))
                put("lastSeen", System.currentTimeMillis())
            }

            onDeviceDiscovered(device)
            Log.i(TAG, "Discovered Fleet node: $deviceName ($senderIp:$httpPort)")
        } catch (e: Exception) {
            Log.w(TAG, "Error parsing discovery packet: ${e.message}")
        }
    }

    private fun startBeaconSender() {
        beaconThread = Thread({
            while (isRunning.get()) {
                sendDiscoveryBeacon()
                try {
                    Thread.sleep(BEACON_INTERVAL_MS)
                } catch (_: InterruptedException) {
                    break
                }
            }
        }, "NodusFleet-UdpBeacon").apply {
            isDaemon = true
            start()
        }
    }

    fun sendDiscoveryBeacon() {
        try {
            val beaconJson = JSONObject().apply {
                put("type", "NODUS_DISCOVER_REQ")
                put("client", "com.nodus.fleet")
                put("version", "1.0.0")
                put("name", "POCO Pad")
                put("deviceType", "tablet")
                put("os", "android")
                put("port", DISCOVERY_PORT)
            }.toString()

            val bytes = beaconJson.toByteArray()
            val broadcastAddr = InetAddress.getByName("255.255.255.255")

            // 1. Broadcast standard Nodus discovery beacon
            socket?.send(DatagramPacket(bytes, bytes.size, broadcastAddr, DISCOVERY_PORT))
            socket?.send(DatagramPacket(bytes, bytes.size, broadcastAddr, COMPANION_PORT))

            // 2. Broadcast PCControlSuite probe for Windows companion discovery
            val pcControlProbe = JSONObject().apply {
                put("discover", "PCCONTROL_MASTER")
                put("client", "com.nodus.fleet")
                put("nonce", System.currentTimeMillis().toString())
            }.toString().toByteArray()
            socket?.send(DatagramPacket(pcControlProbe, pcControlProbe.size, broadcastAddr, DISCOVERY_PORT))
        } catch (e: Exception) {
            Log.w(TAG, "Error sending discovery beacon: ${e.message}")
        }
    }

    private fun acquireMulticastLock() {
        try {
            val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            multicastLock = wifi?.createMulticastLock("NodusFleetMulticastLock")?.apply {
                setReferenceCounted(true)
                acquire()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not acquire MulticastLock: ${e.message}")
        }
    }

    private fun releaseMulticastLock() {
        try {
            if (multicastLock?.isHeld == true) {
                multicastLock?.release()
            }
            multicastLock = null
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing MulticastLock: ${e.message}")
        }
    }
}
