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

class FleetActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "NodusFleetActivity"
    }

    private var webView: WebView? = null
    private lateinit var assetLoader: WebViewAssetLoader

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        startFleetServices()

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
        fun isHomeInstalled(): Boolean = NodusModuleDetector.isHomeInstalled(context)

        @JavascriptInterface
        fun getDevices(): String {
            return FleetDaemonService.instance?.getDevicesJson() ?: "[]"
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
