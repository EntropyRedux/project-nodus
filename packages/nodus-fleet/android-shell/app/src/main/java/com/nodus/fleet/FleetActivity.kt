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

        @JavascriptInterface
        fun getLanDeviceCount(): Int {
            return FleetDaemonService.instance?.getDiscoveredPeersCount() ?: 0
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
                val jsonArray = JSONArray()
                val executor = java.util.concurrent.Executors.newFixedThreadPool(32)
                val futures = java.util.concurrent.CopyOnWriteArrayList<java.util.concurrent.Future<*>>()

                for (i in 1..254) {
                    val ip = "$cleanPrefix.$i"
                    futures.add(executor.submit {
                        try {
                            val addr = java.net.InetAddress.getByName(ip)
                            var isReachable = addr.isReachable(400)
                            var hasNodusAgent = false
                            var devName = "Device ($ip)"

                            // Fast TCP probe on port 9120 for Nodus Companion API
                            try {
                                val s9120 = java.net.Socket()
                                s9120.connect(java.net.InetSocketAddress(ip, 9120), 300)
                                s9120.close()
                                isReachable = true
                                hasNodusAgent = true
                                devName = "Nodus Node ($ip)"
                            } catch (_: Exception) {}

                            // If not 9120, probe common device ports (80 HTTP, 443 HTTPS, 445 SMB, 22 SSH, 8080)
                            if (isReachable && !hasNodusAgent) {
                                val commonPorts = intArrayOf(80, 443, 445, 22, 8080, 5353)
                                for (port in commonPorts) {
                                    try {
                                        val s = java.net.Socket()
                                        s.connect(java.net.InetSocketAddress(ip, port), 250)
                                        s.close()
                                        break
                                    } catch (_: Exception) {}
                                }
                            }

                            if (isReachable) {
                                var finalName = if (hasNodusAgent) "Workstation PC ($ip)" else "Device ($ip)"
                                
                                // Fetch real device name from /api/status if Nodus Agent is running
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
                                            if (realName.isNotBlank()) {
                                                finalName = realName
                                            }
                                        }
                                    } catch (_: Exception) {}
                                } else {
                                    try {
                                        val host = addr.canonicalHostName
                                        if (!host.isNullOrBlank() && host != ip) {
                                            finalName = host
                                        }
                                    } catch (_: Exception) {}
                                }

                                val obj = JSONObject().apply {
                                    put("ip", ip)
                                    put("port", if (hasNodusAgent) 9120 else 80)
                                    put("hostname", finalName)
                                    put("hasAgent", hasNodusAgent)
                                }
                                synchronized(jsonArray) {
                                    jsonArray.put(obj)
                                }
                            }
                        } catch (_: Exception) {}
                    })
                }

                for (f in futures) {
                    try { f.get(600, java.util.concurrent.TimeUnit.MILLISECONDS) } catch (_: Exception) {}
                }
                executor.shutdownNow()
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
