package com.nodus.launcher

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader

class LauncherActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        webView.addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun launchApp(packageName: String): Boolean {
                return try {
                    val intent = packageManager.getLaunchIntentForPackage(packageName)
                    if (intent != null) {
                        startActivity(intent)
                        true
                    } else false
                } catch (_: Exception) {
                    false
                }
            }
        }, "NodusNativeBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }
        }

        // Load Nodus Home frontend bundle through secure asset domain
        webView.loadUrl("https://appassets.androidplatform.net/assets/frontend/index.html")

        handlePairingIntent(intent)
        requestBatteryOptimizationExemption()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handlePairingIntent(intent)
    }

    private fun handlePairingIntent(intent: Intent?) {
        val data: Uri? = intent?.data
        if (data != null && data.scheme == "nodus" && data.host == "pair") {
            val host = data.getQueryParameter("host") ?: ""
            val port = data.getQueryParameter("port") ?: "8890"
            val key = data.getQueryParameter("key") ?: ""

            if (key.isNotEmpty()) {
                val js = """
                    (function() {
                        localStorage.setItem('nodus_shared_key', '$key');
                        localStorage.setItem('nodus_host_server', '$host');
                        localStorage.setItem('nodus_host_port', '$port');
                        console.log('Nodus URI Pairing successful');
                    })();
                """.trimIndent()
                webView.evaluateJavascript(js, null)
            }
        }
    }

    private fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (_: Exception) {
                    // Fallback for custom vendor ROMs
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Nodus Home launcher activity should not close on back press
    }
}
