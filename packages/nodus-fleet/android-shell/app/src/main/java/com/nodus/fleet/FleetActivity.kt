package com.nodus.fleet

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
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
        @Volatile
        var instance: FleetActivity? = null
            private set
    }

    private var webView: WebView? = null
    private lateinit var assetLoader: WebViewAssetLoader

    fun evaluateJs(script: String) {
        runOnUiThread {
            webView?.evaluateJavascript(script, null)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instance = this

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
                allowFileAccess = false
                allowContentAccess = false
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_NO_CACHE
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                }
            }
            clearCache(true)
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

    private var activityClipListener: ClipboardManager.OnPrimaryClipChangedListener? = null

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

    override fun onResume() {
        super.onResume()
        registerClipboardListener()
        checkAndSyncPrimaryClip()
    }

    override fun onPause() {
        super.onPause()
        unregisterClipboardListener()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            registerClipboardListener()
            checkAndSyncPrimaryClip()
        }
    }

    private fun registerClipboardListener() {
        try {
            if (activityClipListener == null) {
                val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                activityClipListener = ClipboardManager.OnPrimaryClipChangedListener {
                    checkAndSyncPrimaryClip()
                }
                cm?.addPrimaryClipChangedListener(activityClipListener)
                Log.d(TAG, "Registered activity clipboard listener")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error registering activity clipboard listener: ${e.message}")
        }
    }

    private fun unregisterClipboardListener() {
        try {
            activityClipListener?.let {
                val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                cm?.removePrimaryClipChangedListener(it)
                activityClipListener = null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering activity clipboard listener: ${e.message}")
        }
    }

    private fun checkAndSyncPrimaryClip() {
        try {
            val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return
            val clip = cm.primaryClip
            if (clip != null && clip.itemCount > 0) {
                val item = clip.getItemAt(0)
                val uri = item?.uri
                val text = item?.text?.toString() ?: item?.coerceToText(this)?.toString()

                if (uri != null) {
                    val processedImage = processImageUri(uri)
                    if (processedImage != null) {
                        ClipboardSyncService.instance?.addAndSync(
                            text = if (!text.isNullOrBlank()) text else "Image",
                            deviceId = "local",
                            imageData = processedImage,
                            isFromLocalDevice = true
                        )
                        return
                    }
                }

                if (!text.isNullOrBlank()) {
                    ClipboardSyncService.instance?.addAndSync(
                        text = text,
                        deviceId = "local",
                        imageData = null,
                        isFromLocalDevice = true
                    )
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error inspecting primary clip: ${e.message}")
        }
    }

    private fun processImageUri(uri: android.net.Uri): String? {
        return try {
            contentResolver.openInputStream(uri)?.use { inputStream ->
                val bytes = inputStream.readBytes()
                val opts = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
                android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
                val w = opts.outWidth
                val h = opts.outHeight
                if (w <= 0 || h <= 0) return null

                var sampleSize = 1
                val maxDim = 800
                while (w / sampleSize > maxDim * 2 || h / sampleSize > maxDim * 2) {
                    sampleSize *= 2
                }
                val decodeOpts = android.graphics.BitmapFactory.Options().apply {
                    inSampleSize = sampleSize
                }
                val bmp = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOpts) ?: return null
                val scale = minOf(maxDim.toFloat() / bmp.width, maxDim.toFloat() / bmp.height, 1.0f)
                val scaled = if (scale < 1.0f) {
                    android.graphics.Bitmap.createScaledBitmap(bmp, (bmp.width * scale).toInt(), (bmp.height * scale).toInt(), true)
                } else {
                    bmp
                }
                val stream = java.io.ByteArrayOutputStream()
                scaled.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, stream)
                val b64 = android.util.Base64.encodeToString(stream.toByteArray(), android.util.Base64.NO_WRAP)
                "data:image/jpeg;base64,$b64"
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to decode image uri: ${e.message}")
            null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance === this) {
            instance = null
        }
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
            val prefs = context.getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
            val savedCount = prefs.getInt("last_scanned_lan_count", 0)
            val udpCount = FleetDaemonService.instance?.getDiscoveredPeersCount() ?: 0
            val current = maxOf(lastScannedLanCount, savedCount, udpCount)
            return if (current > 0) current else 1
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
        fun deleteClipboardItem(id: String) {
            ClipboardSyncService.instance?.deleteItem(id)
        }

        @JavascriptInterface
        fun toggleClipboardPin(id: String) {
            ClipboardSyncService.instance?.togglePin(id)
        }

        @JavascriptInterface
        fun isClipboardSyncEnabled(): Boolean {
            return ClipboardSyncService.instance?.isSyncEnabled()
                ?: context.getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
                    .getBoolean("clipboard_sync_enabled", true)
        }

        @JavascriptInterface
        fun setClipboardSyncEnabled(enabled: Boolean) {
            context.getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
                .edit()
                .putBoolean("clipboard_sync_enabled", enabled)
                .apply()
            ClipboardSyncService.instance?.setSyncEnabled(enabled)
            FleetDaemonService.instance?.notifyStateChanged()
        }

        @JavascriptInterface
        fun setClipboardText(text: String) {
            setClipboardTextWithImage(text, null)
        }

        @JavascriptInterface
        fun setClipboardTextWithImage(text: String, imageData: String?) {
            copyToClipboardWithImage(text, imageData)
        }

        @JavascriptInterface
        fun copyToClipboard(text: String) {
            copyToClipboardWithImage(text, null)
        }

        @JavascriptInterface
        fun copyImageToClipboard(imageData: String, text: String?) {
            copyToClipboardWithImage(text ?: "Image", imageData)
        }

        @JavascriptInterface
        fun copyToClipboardWithImage(text: String, imageData: String?) {
            val rawImage = imageData?.trim()
            val cleanImage = if (rawImage.isNullOrBlank() || rawImage == "null" || rawImage == "undefined") null else rawImage
            val cleanText = text.trim()

            if (!cleanImage.isNullOrBlank()) {
                runOnUiThread {
                    try {
                        val imagesDir = java.io.File(context.cacheDir, "clipboard_images")
                        imagesDir.mkdirs()
                        val imageFile = java.io.File(imagesDir, "clip_current.png")
                        val rawBase64 = if (cleanImage.contains("base64,")) {
                            cleanImage.substringAfter("base64,")
                        } else {
                            cleanImage
                        }
                        val bytes = android.util.Base64.decode(rawBase64, android.util.Base64.DEFAULT)
                        imageFile.writeBytes(bytes)

                        val uri = androidx.core.content.FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.fileprovider",
                            imageFile
                        )
                        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                        val clipData = ClipData.newUri(contentResolver, "Nodus Fleet Image", uri)
                        cm?.setPrimaryClip(clipData)
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to copy image to clipboard: ${e.message}")
                    }
                }
                ClipboardSyncService.instance?.addAndSync(if (cleanText.isNotBlank()) cleanText else "Image", "local", imageData = cleanImage, isFromLocalDevice = true)
            } else {
                runOnUiThread {
                    try {
                        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                        cm?.setPrimaryClip(ClipData.newPlainText("Nodus Fleet", cleanText))
                    } catch (_: Exception) {}
                }
                ClipboardSyncService.instance?.addAndSync(cleanText, "local", imageData = null, isFromLocalDevice = true)
            }
        }

        @JavascriptInterface
        fun addPairedDevice(ip: String, port: Int, name: String) {
            val cleanIp = ip.trim()
            val deviceId = "win-${cleanIp.replace(".", "-")}"
            val httpPort = if (port > 0) port else 9120
            val dev = JSONObject().apply {
                put("id", deviceId)
                put("name", if (name.isNotBlank()) name else "Workstation Host ($cleanIp)")
                put("type", "desktop")
                put("os", "windows")
                put("status", "connected")
                put("ipAddress", cleanIp)
                put("httpPort", httpPort)
                put("battery", 100)
                put("cpuLoad", 15)
                put("ramUsage", "Active")
                put("lastSeen", System.currentTimeMillis())
            }
            FleetDaemonService.instance?.addOrUpdateRemoteDevice(dev)

            // Dispatch pairing handshake to the target device so it adds the tablet back
            Thread {
                try {
                    val u = java.net.URL("http://$cleanIp:$httpPort/api/fleet/pair-request")
                    val conn = u.openConnection() as java.net.HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.connectTimeout = 2500
                    conn.readTimeout = 2500
                    conn.doOutput = true
                    conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    val payload = JSONObject().apply {
                        put("id", "poco-pad")
                        put("deviceId", "poco-pad")
                        put("name", "POCO Pad")
                        put("deviceType", "tablet")
                        put("type", "tablet")
                        put("os", "Android 14 (HyperOS)")
                        put("httpPort", 9120)
                        put("port", 9120)
                    }
                    conn.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
                    conn.responseCode
                } catch (_: Exception) {}
            }.start()
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
                val executor = java.util.concurrent.Executors.newFixedThreadPool(16)
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
                            var latencyMs: Long = 10

                            val startTime = System.currentTimeMillis()

                            // 1. Fast TCP probe on port 9120 for Nodus Companion API
                            try {
                                val s9120 = java.net.Socket()
                                s9120.connect(java.net.InetSocketAddress(ip, 9120), 180)
                                s9120.close()
                                hasNodusAgent = true
                                isReachable = true
                                openPort = 9120
                                finalName = "Nodus Node ($ip)"
                                latencyMs = (System.currentTimeMillis() - startTime).coerceAtLeast(1)
                            } catch (_: Exception) {}

                            // 2. If Nodus Agent active, fetch real telemetry & device name
                            if (hasNodusAgent) {
                                try {
                                    val u = java.net.URL("http://$ip:9120/api/status")
                                    val c = u.openConnection() as java.net.HttpURLConnection
                                    c.connectTimeout = 300
                                    c.readTimeout = 300
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
                                // 3. Probe common network ports (80, 8080, 443, 8765, 5555, 22)
                                val commonPorts = intArrayOf(80, 8080, 443, 8765, 5555, 22)
                                for (port in commonPorts) {
                                    try {
                                        val s = java.net.Socket()
                                        s.connect(java.net.InetSocketAddress(ip, port), 70)
                                        s.close()
                                        isReachable = true
                                        openPort = port
                                        latencyMs = (System.currentTimeMillis() - startTime).coerceAtLeast(1)
                                        devType = inferDeviceType(finalName, ip)
                                        break
                                    } catch (_: Exception) {}
                                }

                                // 4. If TCP closed, use Native ICMP Ping to detect firewalled/sleeping LAN devices
                                if (!isReachable) {
                                    try {
                                        val pingProc = Runtime.getRuntime().exec(arrayOf("/system/bin/ping", "-c", "1", "-W", "1", "-w", "1", ip))
                                        val exit = pingProc.waitFor()
                                        if (exit == 0) {
                                            isReachable = true
                                            openPort = 80
                                            latencyMs = (System.currentTimeMillis() - startTime).coerceAtLeast(1)
                                            finalName = "LAN Device ($ip)"
                                            devType = inferDeviceType(finalName, ip)
                                            osName = "LAN Device"
                                        }
                                    } catch (_: Exception) {}
                                }
                            }

                            if (isReachable) {
                                val obj = JSONObject().apply {
                                    put("ip", ip)
                                    put("port", openPort)
                                    put("hostname", finalName)
                                    put("hasAgent", hasNodusAgent)
                                    put("isInFleet", false)
                                    put("deviceType", devType)
                                    put("os", osName)
                                    put("latencyMs", latencyMs)
                                }
                                discoveredMap[ip] = obj
                            }
                        } catch (_: Exception) {}
                    })
                }

                for (f in futures) {
                    try { f.get(3500, java.util.concurrent.TimeUnit.MILLISECONDS) } catch (_: Exception) {}
                }
                executor.shutdown()

                // 5. Merge any UDP discovered peers from FleetDaemonService
                val udpPeersJson = FleetDaemonService.instance?.getDiscoveredPeersJson() ?: "[]"
                try {
                    val udpArray = JSONArray(udpPeersJson)
                    for (idx in 0 until udpArray.length()) {
                        val p = udpArray.getJSONObject(idx)
                        val pIp = p.optString("ipAddress")
                        if (pIp.isNotEmpty() && pIp != localIp && pIp != "127.0.0.1") {
                            val existing = discoveredMap[pIp]
                            val obj = JSONObject().apply {
                                put("ip", pIp)
                                put("port", p.optInt("httpPort", 9120))
                                put("hostname", p.optString("name", "Nodus Node ($pIp)"))
                                put("hasAgent", true)
                                put("isInFleet", false)
                                put("deviceType", p.optString("type", "desktop"))
                                put("os", p.optString("os", "windows"))
                                put("latencyMs", existing?.optLong("latencyMs", 5) ?: 5)
                            }
                            discoveredMap[pIp] = obj
                        }
                    }
                } catch (_: Exception) {}

                // 6. Convert to sorted array (Nodus Agents first, then IP numerical order)
                val sortedList = discoveredMap.values.sortedWith(Comparator { a, b ->
                    val aAgent = a.optBoolean("hasAgent", false)
                    val bAgent = b.optBoolean("hasAgent", false)
                    if (aAgent != bAgent) {
                        if (aAgent) -1 else 1
                    } else {
                        val aLast = a.optString("ip").substringAfterLast(".", "0").toIntOrNull() ?: 0
                        val bLast = b.optString("ip").substringAfterLast(".", "0").toIntOrNull() ?: 0
                        aLast.compareTo(bLast)
                    }
                })

                val jsonArray = JSONArray()
                for (item in sortedList) {
                    jsonArray.put(item)
                }

                lastScannedLanCount = jsonArray.length()
                context.getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
                    .edit()
                    .putInt("last_scanned_lan_count", lastScannedLanCount)
                    .apply()

                jsonArray.toString()
            } catch (e: Exception) {
                Log.e(TAG, "Subnet scan error", e)
                "[]"
            }
        }

        @JavascriptInterface
        fun getDiscoveredPeers(): String {
            return FleetDaemonService.instance?.getDiscoveredPeersJson() ?: "[]"
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
                val pairedToken = FleetDaemonService.instance?.getTokenForHost(url.host)
                if (!pairedToken.isNullOrBlank()) {
                    conn.setRequestProperty("Authorization", "Bearer $pairedToken")
                    conn.setRequestProperty("X-Nodus-Auth-Token", pairedToken)
                }

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
        fun isAccessibilityEnabled(): Boolean {
            return com.nodus.fleet.service.NodusAccessibilityService.isEnabled(context)
        }

        @JavascriptInterface
        fun openAccessibilitySettings() {
            try {
                val intent = Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open accessibility settings: ${e.message}")
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
