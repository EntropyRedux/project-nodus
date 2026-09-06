package com.nodus.fleet

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import com.nodus.common.NodusIpcContract
import com.nodus.common.NodusModuleDetector
import com.nodus.fleet.service.ClipboardSyncService
import com.nodus.fleet.service.FleetDaemonService
import org.json.JSONArray
import org.json.JSONObject

class FleetActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "NodusFleetActivity"
    }

    private var webView: WebView? = null
    private lateinit var assetLoader: WebViewAssetLoader

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
        val autoStart = prefs.getBoolean("auto_start_daemon", true)
        if (autoStart) {
            startFleetServices()
        }

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }
            }
            setBackgroundColor(0xFF030712.toInt())

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        Log.d("NodusFleetConsole", "[${it.messageLevel()}] ${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}")
                    }
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    if (request?.url != null) {
                        val response = assetLoader.shouldInterceptRequest(request.url)
                        if (response != null) return response
                    }
                    return super.shouldInterceptRequest(view, request)
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    Log.i(TAG, "Fleet WebView loaded: $url")
                }

                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    super.onReceivedError(view, request, error)
                    Log.e(TAG, "Fleet WebView error on [${request?.url}]: ${error?.description}")
                }
            }

            addJavascriptInterface(FleetNativeBridge(this@FleetActivity), "NodusNativeBridge")
        }

        setContentView(webView)
        webView?.loadUrl("https://appassets.androidplatform.net/assets/frontend/index.html")
    }

    private fun startFleetServices() {
        val daemonIntent = Intent(this, FleetDaemonService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(this, daemonIntent)
        } else {
            startService(daemonIntent)
        }

        val clipIntent = Intent(this, ClipboardSyncService::class.java)
        startService(clipIntent)
    }

    override fun onDestroy() {
        super.onDestroy()
        webView?.destroy()
        webView = null
    }

    inner class FleetNativeBridge(private val context: Context) {

        @JavascriptInterface
        fun isDaemonRunning(): Boolean {
            return FleetDaemonService.instance != null
        }

        @JavascriptInterface
        fun setDaemonRunning(running: Boolean) {
            if (running) {
                startFleetServices()
            } else {
                stopService(Intent(this@FleetActivity, FleetDaemonService::class.java))
                stopService(Intent(this@FleetActivity, ClipboardSyncService::class.java))
            }
        }

        @JavascriptInterface
        fun getAutoStart(): Boolean {
            return context.getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
                .getBoolean("auto_start_daemon", true)
        }

        @JavascriptInterface
        fun setAutoStart(enabled: Boolean) {
            context.getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
                .edit()
                .putBoolean("auto_start_daemon", enabled)
                .apply()
        }

        @JavascriptInterface
        fun isHomeInstalled(): Boolean = NodusModuleDetector.isHomeInstalled(context)

        @JavascriptInterface
        fun getDevices(): String {
            return FleetDaemonService.instance?.getDevicesJson() ?: "[]"
        }

        private var lastScannedLanCount: Int = 0

        private fun getLocalWifiIp(): String? {
            try {
                val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
                while (interfaces.hasMoreElements()) {
                    val iface = interfaces.nextElement()
                    if (iface.isLoopback || !iface.isUp) continue
                    val addrs = iface.inetAddresses
                    while (addrs.hasMoreElements()) {
                        val addr = addrs.nextElement()
                        if (addr is java.net.Inet4Address && !addr.isLoopbackAddress) {
                            return addr.hostAddress
                        }
                    }
                }
            } catch (_: Exception) {}
            return null
        }

        private fun inferDeviceType(hostname: String, ip: String): String {
            val h = hostname.toLowerCase()
            return when {
                h.contains("pad") || h.contains("tab") || h.contains("surface") || h.contains("poco") -> "tablet"
                h.contains("phone") || h.contains("pixel") || h.contains("galaxy") || h.contains("iphone") || h.contains("android") -> "phone"
                h.contains("macbook") || h.contains("laptop") || h.contains("thinkpad") || h.contains("book") -> "laptop"
                else -> "desktop"
            }
        }

        private fun getArpDevices(subnetPrefix: String = "192.168.1"): Map<String, String> {
            val map = mutableMapOf<String, String>()
            val cleanPrefix = subnetPrefix.trim().removeSuffix(".")

            // 1. Read /proc/net/arp
            try {
                val file = java.io.File("/proc/net/arp")
                if (file.exists()) {
                    file.forEachLine { line ->
                        val parts = line.split("\\s+".toRegex())
                        if (parts.size >= 4) {
                            val ip = parts[0]
                            val mac = parts[3]
                            if (ip.startsWith(cleanPrefix) && mac != "00:00:00:00:00:00" && !mac.contains("00:00:00:00:00:00") && mac.length == 17) {
                                map[ip] = mac
                            }
                        }
                    }
                }
            } catch (_: Exception) {}

            // 2. Command fallback: ip neigh show
            if (map.isEmpty()) {
                try {
                    val process = Runtime.getRuntime().exec(arrayOf("ip", "neigh"))
                    val reader = process.inputStream.bufferedReader()
                    reader.forEachLine { line ->
                        val parts = line.split("\\s+".toRegex())
                        if (parts.size >= 5) {
                            val ip = parts[0]
                            val lladdrIndex = parts.indexOf("lladdr")
                            if (lladdrIndex != -1 && lladdrIndex + 1 < parts.size) {
                                val mac = parts[lladdrIndex + 1]
                                if (ip.startsWith(cleanPrefix) && mac != "00:00:00:00:00:00") {
                                    map[ip] = mac
                                }
                            }
                        }
                    }
                    process.waitFor()
                } catch (_: Exception) {}
            }

            return map
        }

        @JavascriptInterface
        fun getLanDeviceCount(subnet: String = "192.168.1"): Int {
            val arpCount = getArpDevices(subnet).size
            val udpCount = FleetDaemonService.instance?.getDiscoveredPeersCount() ?: 0
            return maxOf(lastScannedLanCount, arpCount, udpCount)
        }

        @JavascriptInterface
        fun getClipboardHistory(): String {
            return ClipboardSyncService.instance?.getClipboardJson() ?: "[]"
        }

        @JavascriptInterface
        fun clearClipboard() {
            ClipboardSyncService.instance?.clearHistory()
        }

        @JavascriptInterface
        fun setClipboardText(text: String) {
            ClipboardSyncService.instance?.addAndSync(text, "local", isFromLocalDevice = true)
        }

        @JavascriptInterface
        fun copyToClipboard(text: String) {
            ClipboardSyncService.instance?.addAndSync(text, "local", isFromLocalDevice = false)
        }

        @JavascriptInterface
        fun addPairedDevice(ip: String, port: Int, name: String) {
            val cleanIp = ip.trim()
            val deviceId = "win-${cleanIp.replace(".", "-")}"
            val dev = JSONObject().apply {
                put("id", deviceId)
                put("name", if (name.isNotBlank()) name else "Workstation Host ($cleanIp)")
                put("type", "desktop")
                put("os", "windows")
                put("status", "connected")
                put("ipAddress", cleanIp)
                put("httpPort", if (port > 0) port else 9120)
                put("battery", 100)
                put("cpuLoad", 15)
                put("ramUsage", "Active")
                put("lastSeen", System.currentTimeMillis())
            }
            FleetDaemonService.instance?.addOrUpdateRemoteDevice(dev)
        }

        @JavascriptInterface
        fun removeDevice(id: String) {
            Log.i(TAG, "Removing remote device $id")
            FleetDaemonService.instance?.removeRemoteDevice(id)
        }

        @JavascriptInterface
        fun rebootDevice(id: String) {
            Log.i(TAG, "Requesting reboot for device $id")
            FleetDaemonService.instance?.sendRemoteSystemControl(id, "restart")
        }

        @JavascriptInterface
        fun rescanMesh() {
            Log.i(TAG, "Triggering manual mesh rescan beacon")
            FleetDaemonService.instance?.notifyStateChanged()
        }

        @JavascriptInterface
        fun executeRemoteShortcut(deviceId: String, command: String) {
            FleetDaemonService.instance?.executeRemoteShortcut(deviceId, command)
        }

        @JavascriptInterface
        fun killRemoteProcess(deviceId: String, pid: Int) {
            FleetDaemonService.instance?.killRemoteProcess(deviceId, pid)
        }

        @JavascriptInterface
        fun scanSubnetNative(subnetPrefix: String): String {
            return try {
                val cleanPrefix = subnetPrefix.trim().removeSuffix(".")
                val localIp = getLocalWifiIp() ?: "127.0.0.1"
                val discoveredMap = java.util.concurrent.ConcurrentHashMap<String, JSONObject>()
                val executor = java.util.concurrent.Executors.newFixedThreadPool(48)
                val futures = java.util.concurrent.CopyOnWriteArrayList<java.util.concurrent.Future<*>>()

                for (i in 1..254) {
                    val ip = "$cleanPrefix.$i"
                    if (ip == localIp || ip == "127.0.0.1") continue

                    futures.add(executor.submit {
                        try {
                            var hasNodusAgent = false
                            var finalName = "Device ($ip)"
                            var openPort = 80
                            var devType = "desktop"
                            var osName = "LAN Device"
                            var isReachable = false

                            // 1. Fast TCP probe on port 9120 for Nodus Companion API
                            try {
                                val s9120 = java.net.Socket()
                                s9120.connect(java.net.InetSocketAddress(ip, 9120), 300)
                                s9120.close()
                                hasNodusAgent = true
                                isReachable = true
                                openPort = 9120
                                finalName = "Nodus Node ($ip)"
                            } catch (_: Exception) {}

                            // 2. If Nodus Agent active, fetch real telemetry & device name
                            if (hasNodusAgent) {
                                try {
                                    val u = java.net.URL("http://$ip:9120/api/status")
                                    val c = u.openConnection() as java.net.HttpURLConnection
                                    c.connectTimeout = 400
                                    c.readTimeout = 400
                                    if (c.responseCode == 200) {
                                        val text = c.inputStream.bufferedReader().readText()
                                        val st = JSONObject(text)
                                        val realName = st.optString("name", st.optString("hostname", ""))
                                        if (realName.isNotBlank()) finalName = realName
                                        devType = st.optString("deviceType", st.optString("type", "desktop"))
                                        osName = st.optString("os", "windows")
                                    }
                                } catch (_: Exception) {}
                            } else {
                                // 3. Probe common network ports: HTTP 80, HTTPS 443, Alt-HTTP 8080, Fleet UDP/TCP 8765, mDNS 5353, SMB 445, SSH 22, ADB 5555, AirPlay 62078
                                val commonPorts = intArrayOf(80, 443, 8080, 8765, 5353, 445, 22, 5555, 62078, 1900)
                                for (port in commonPorts) {
                                    try {
                                        val s = java.net.Socket()
                                        s.connect(java.net.InetSocketAddress(ip, port), 120)
                                        s.close()
                                        isReachable = true
                                        openPort = port
                                        break
                                    } catch (_: Exception) {}
                                }

                                if (isReachable) {
                                    try {
                                        val addr = java.net.InetAddress.getByName(ip)
                                        val host = addr.canonicalHostName
                                        if (!host.isNullOrBlank() && host != ip) {
                                            finalName = host
                                        }
                                    } catch (_: Exception) {}
                                    devType = inferDeviceType(finalName, ip)
                                }
                            }

                            if (isReachable) {
                                val obj = JSONObject().apply {
                                    put("ip", ip)
                                    put("port", openPort)
                                    put("hostname", finalName)
                                    put("hasAgent", hasNodusAgent)
                                    put("deviceType", devType)
                                    put("os", osName)
                                }
                                discoveredMap[ip] = obj
                            }
                        } catch (_: Exception) {}
                    })
                }

                for (f in futures) {
                    try { f.get(650, java.util.concurrent.TimeUnit.MILLISECONDS) } catch (_: Exception) {}
                }
                executor.shutdownNow()

                // 4. Post-Sweep: Check ARP cache for any responsive neighbors that didn't have the tested TCP ports open
                val arpDevices = getArpDevices(cleanPrefix)
                for ((arpIp, mac) in arpDevices) {
                    if (arpIp != localIp && arpIp != "127.0.0.1" && !discoveredMap.containsKey(arpIp)) {
                        var resolvedHost = "LAN Device ($arpIp)"
                        try {
                            val addr = java.net.InetAddress.getByName(arpIp)
                            val host = addr.canonicalHostName
                            if (!host.isNullOrBlank() && host != arpIp) {
                                resolvedHost = host
                            }
                        } catch (_: Exception) {}

                        val obj = JSONObject().apply {
                            put("ip", arpIp)
                            put("port", 80)
                            put("hostname", resolvedHost)
                            put("hasAgent", false)
                            put("deviceType", inferDeviceType(resolvedHost, arpIp))
                            put("os", "LAN Device")
                            put("mac", mac)
                        }
                        discoveredMap[arpIp] = obj
                    }
                }

                // 5. Convert to sorted array (Nodus Agents first, then IP order)
                val jsonArray = JSONArray()
                val sortedList = discoveredMap.values.sortedWith(Comparator { a, b ->
                    val aAgent = a.optBoolean("hasAgent", false)
                    val bAgent = b.optBoolean("hasAgent", false)
                    if (aAgent != bAgent) {
                        if (aAgent) -1 else 1
                    } else {
                        a.optString("ip").compareTo(b.optString("ip"))
                    }
                })

                for (item in sortedList) {
                    jsonArray.put(item)
                }

                lastScannedLanCount = jsonArray.length()
                jsonArray.toString()
            } catch (e: Exception) {
                Log.e(TAG, "Subnet scan error", e)
                "[]"
            }
        }

        @JavascriptInterface
        fun httpFetch(urlStr: String, method: String, body: String, timeoutMs: Int = 1000): String {
            return try {
                val url = java.net.URL(urlStr)
                val conn = url.openConnection() as java.net.HttpURLConnection
                val timeout = if (timeoutMs > 0) timeoutMs else 1000
                conn.requestMethod = method.uppercase()
                conn.connectTimeout = timeout
                conn.readTimeout = timeout
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.setRequestProperty("Authorization", "Bearer NODUS-FLEET-SECURE")
                conn.setRequestProperty("X-Nodus-Auth-Token", "NODUS-FLEET-SECURE")

                if (method.equals("POST", ignoreCase = true) || method.equals("PUT", ignoreCase = true)) {
                    conn.doOutput = true
                    conn.outputStream.use { os ->
                        os.write(body.toByteArray(Charsets.UTF_8))
                    }
                }

                val code = conn.responseCode
                val responseStream = if (code in 200..299) conn.inputStream else conn.errorStream
                val responseText = responseStream?.bufferedReader()?.use { it.readText() } ?: "{}"

                org.json.JSONObject().apply {
                    put("status", code)
                    put("ok", code in 200..299)
                    put("data", responseText)
                }.toString()
            } catch (e: Exception) {
                Log.e(TAG, "Native HTTP fetch error for $urlStr", e)
                org.json.JSONObject().apply {
                    put("status", 500)
                    put("ok", false)
                    put("error", e.message ?: "Unknown error")
                }.toString()
            }
        }

        @JavascriptInterface
        fun openInHome() {
            try {
                val intent = context.packageManager.getLaunchIntentForPackage(NodusIpcContract.PACKAGE_HOME)
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch Nodus Home: ${e.message}")
            }
        }
    }
}
