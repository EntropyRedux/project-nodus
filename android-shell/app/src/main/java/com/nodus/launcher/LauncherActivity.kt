package com.nodus.launcher

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.app.ActivityOptions
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Rect
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.util.Xml
import com.nodus.launcher.service.NodusNotificationListenerService
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import org.json.JSONArray
import org.json.JSONObject
import org.xmlpull.v1.XmlPullParser
import java.io.ByteArrayOutputStream

class LauncherActivity : AppCompatActivity() {

    companion object {
        const val TAG = "NodusLauncherActivity"
    }

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            val data = result.data
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)
            filePathCallback?.onReceiveValue(uris)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    private val packageChangeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            runOnUiThread {
                webView.evaluateJavascript("(function(){ if (window.dispatchEvent) { window.dispatchEvent(new CustomEvent('nodus-package-changed')); } })()", null)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            // Enable WebView debugging for dev / debug builds
            if (0 != (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE)) {
                WebView.setWebContentsDebuggingEnabled(true)
            }

            // Set up secure local asset loader for Android WebView
            assetLoader = WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
                .build()

            webView = WebView(this)
            setContentView(webView)

            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                loadWithOverviewMode = true
                useWideViewPort = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }

            webView.addJavascriptInterface(object {
                @JavascriptInterface
                fun getInstalledApps(): String {
                    return try {
                        val jsonArray = JSONArray()
                        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                            addCategory(Intent.CATEGORY_LAUNCHER)
                        }
                        val resolveInfos = packageManager.queryIntentActivities(mainIntent, 0)

                        val sortedList = resolveInfos.sortedBy {
                            it.loadLabel(packageManager).toString().lowercase()
                        }

                        for (ri in sortedList) {
                            val pkg = ri.activityInfo.packageName
                            if (pkg == packageName) continue // Don't include ourselves

                            val label = ri.loadLabel(packageManager).toString()
                            val iconDrawable = ri.loadIcon(packageManager)
                            val iconDataUri = drawableToBase64(iconDrawable)
                            val isSystem = (ri.activityInfo.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0

                            val appObj = JSONObject().apply {
                                put("packageName", pkg)
                                put("label", label)
                                put("icon", iconDataUri)
                                put("isSystemApp", isSystem)
                            }
                            jsonArray.put(appObj)
                        }
                        Log.i(TAG, "Queried ${jsonArray.length()} installed apps from device")
                        jsonArray.toString()
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to query installed apps", e)
                        "[]"
                    }
                }

                @JavascriptInterface
                fun launchApp(packageName: String): Boolean {
                    return try {
                        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (intent != null) {
                            startActivity(intent)
                            true
                        } else {
                            Log.w(TAG, "No launch intent found for $packageName")
                            false
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to launch package $packageName", e)
                        false
                    }
                }

                @JavascriptInterface
                fun bringLauncherToFront(): Boolean {
                    return try {
                        val intent = Intent(this@LauncherActivity, LauncherActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        runOnUiThread {
                            window.decorView.requestFocus()
                        }
                        true
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to bring launcher to front", e)
                        false
                    }
                }

                @JavascriptInterface
                fun bringAppToFront(packageName: String): Boolean {
                    return try {
                        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                            addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        }
                        if (intent != null) {
                            startActivity(intent)
                            true
                        } else {
                            launchApp(packageName)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to bring app $packageName to front", e)
                        false
                    }
                }

                @JavascriptInterface
                fun minimizeApp(packageName: String): Boolean {
                    return try {
                        // 1. Send MIUI/HyperOS Freeform minimize broadcast
                        try {
                            val miuiIntent = Intent("miui.intent.action.FREEFORM_MINIMIZE").apply {
                                putExtra("package_name", packageName)
                                putExtra("miui.intent.extra.freeform_window_mode", 0)
                            }
                            sendBroadcast(miuiIntent)
                        } catch (_: Exception) {}

                        // 2. Re-target the app into the standard fullscreen background layer (Layer 1)
                        try {
                            val appIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                                putExtra("miui.intent.extra.open_in_floating_window", false)
                                putExtra("miui.intent.extra.floating_window", false)
                                putExtra("android.intent.extra.WINDOW_MODE", 1) // WINDOWING_MODE_FULLSCREEN = 1
                            }
                            if (appIntent != null) {
                                val options = ActivityOptions.makeBasic()
                                val bundle = options.toBundle() ?: Bundle()
                                bundle.putInt("android:activity.launchWindowingMode", 1)
                                bundle.putInt("android.activity.windowingMode", 1)
                                startActivity(appIntent, bundle)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Could not convert task windowing mode: ${e.message}")
                        }

                        // 3. Bring Nodus LauncherActivity in front of it on Layer 1
                        val launcherIntent = Intent(this@LauncherActivity, LauncherActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(launcherIntent)

                        runOnUiThread {
                            window.decorView.requestFocus()
                        }
                        true
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to minimize app $packageName", e)
                        bringLauncherToFront()
                    }
                }

                @JavascriptInterface
                fun minimizeActiveWindow(): Boolean {
                    return bringLauncherToFront()
                }

                @JavascriptInterface
                fun launchAppFloating(packageName: String): Boolean {
                    return try {
                        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                            // Xiaomi HyperOS / MIUI floating window extras
                            putExtra("miui.intent.extra.open_in_floating_window", true)
                            putExtra("miui.intent.extra.floating_window", true)
                            putExtra("miui.intent.extra.drag_to_floating_window", true)
                            putExtra("android.intent.extra.WINDOW_MODE", 5)
                        }
                        if (intent != null) {
                            val dm = resources.displayMetrics
                            val width = (dm.widthPixels * 0.68).toInt()
                            val height = (dm.heightPixels * 0.72).toInt()
                            val left = (dm.widthPixels - width) / 2
                            val top = (dm.heightPixels - height) / 2
                            val bounds = Rect(left, top, left + width, top + height)

                            val options = ActivityOptions.makeBasic()
                            options.setLaunchBounds(bounds)

                            val bundle = options.toBundle() ?: Bundle()
                            bundle.putInt("android:activity.launchWindowingMode", 5) // WINDOWING_MODE_FREEFORM = 5
                            bundle.putInt("android.activity.windowingMode", 5)
                            bundle.putInt("android:activity.windowingMode", 5)
                            bundle.putParcelable("android:activity.launchBounds", bounds)
                            bundle.putParcelable("android.activity.launchBounds", bounds)
                            bundle.putBoolean("miui.intent.extra.open_in_floating_window", true)
                            bundle.putBoolean("miui.intent.extra.floating_window", true)

                            startActivity(intent, bundle)
                            Log.i(TAG, "Launched $packageName in floating window mode with bounds: $bounds")
                            true
                        } else {
                            Log.w(TAG, "No launch intent found for $packageName")
                            false
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to launch floating app $packageName, falling back to standard launch", e)
                        launchApp(packageName)
                    }
                }

                @JavascriptInterface
                fun openAppSettings(packageName: String): Boolean {
                    return try {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.fromParts("package", packageName, null)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        true
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to open app settings for $packageName", e)
                        false
                    }
                }

                @JavascriptInterface
                fun uninstallApp(packageName: String): Boolean {
                    return try {
                        val intent = Intent(Intent.ACTION_DELETE).apply {
                            data = Uri.parse("package:$packageName")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        true
                    } catch (e: Exception) {
                        try {
                            val intent = Intent(Intent.ACTION_UNINSTALL_PACKAGE).apply {
                                data = Uri.parse("package:$packageName")
                                putExtra(Intent.EXTRA_RETURN_RESULT, true)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                            true
                        } catch (e2: Exception) {
                            Log.e(TAG, "Failed to initiate uninstall for $packageName", e2)
                            false
                        }
                    }
                }

                @JavascriptInterface
                fun showToast(message: String, isLong: Boolean): Boolean {
                    runOnUiThread {
                        Toast.makeText(this@LauncherActivity, message, if (isLong) Toast.LENGTH_LONG else Toast.LENGTH_SHORT).show()
                    }
                    return true
                }

                @JavascriptInterface
                fun getInstalledIconPacks(): String {
                    return try {
                        val jsonArray = JSONArray()
                        val actions = listOf(
                            "org.adw.launcher.THEMES",
                            "com.novalauncher.THEME",
                            "com.fede.launcher.THEME_ICONPACK",
                            "com.teslacoilsw.launcher.THEME",
                            "com.gau.go.launcherex.theme",
                            "com.anddoes.launcher.THEME"
                        )
                        val seenPackages = mutableSetOf<String>()
                        for (action in actions) {
                            val intent = Intent(action)
                            val resolveInfos = packageManager.queryIntentActivities(intent, 0)
                            for (ri in resolveInfos) {
                                val pkg = ri.activityInfo.packageName
                                if (seenPackages.add(pkg)) {
                                    val label = ri.loadLabel(packageManager).toString()
                                    val icon = drawableToBase64(ri.loadIcon(packageManager))
                                    jsonArray.put(JSONObject().apply {
                                        put("packageName", pkg)
                                        put("name", label)
                                        put("icon", icon)
                                    })
                                }
                            }
                        }
                        jsonArray.toString()
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to query installed icon packs", e)
                        "[]"
                    }
                }

                @JavascriptInterface
                fun getIconPackIcons(iconPackPackage: String): String {
                    return try {
                        val res = packageManager.getResourcesForApplication(iconPackPackage)
                        val jsonResult = JSONObject()
                        var parser: XmlPullParser? = null
                        try {
                            val assetManager = createPackageContext(iconPackPackage, 0).assets
                            val inputStream = assetManager.open("appfilter.xml")
                            parser = Xml.newPullParser().apply {
                                setInput(inputStream, "utf-8")
                            }
                        } catch (e: Exception) {
                            val xmlId = res.getIdentifier("appfilter", "xml", iconPackPackage)
                            if (xmlId != 0) {
                                parser = res.getXml(xmlId)
                            }
                        }

                        if (parser != null) {
                            var eventType = parser.eventType
                            while (eventType != XmlPullParser.END_DOCUMENT) {
                                if (eventType == XmlPullParser.START_TAG && parser.name == "item") {
                                    val component = parser.getAttributeValue(null, "component")
                                    val drawableName = parser.getAttributeValue(null, "drawable")
                                    if (!component.isNullOrEmpty() && !drawableName.isNullOrEmpty()) {
                                        val pkgMatch = Regex("""ComponentInfo\{([^/]+)""").find(component)
                                        val pkg = pkgMatch?.groupValues?.get(1)
                                        if (pkg != null) {
                                            val drawableId = res.getIdentifier(drawableName, "drawable", iconPackPackage)
                                            if (drawableId != 0) {
                                                try {
                                                    val drawable = res.getDrawable(drawableId, null)
                                                    if (drawable != null) {
                                                        val base64 = drawableToBase64(drawable)
                                                        if (base64.isNotEmpty()) {
                                                            jsonResult.put(pkg, base64)
                                                        }
                                                    }
                                                } catch (e: Exception) {
                                                    // ignore individual drawable loading failure
                                                }
                                            }
                                        }
                                    }
                                }
                                eventType = parser.next()
                            }
                        }
                        jsonResult.toString()
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to load icon pack icons for $iconPackPackage", e)
                        "{}"
                    }
                }

                @JavascriptInterface
                fun requestBatteryExemption(): Boolean {
                    return try {
                        requestBatteryOptimizationExemption()
                        true
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to request battery exemption", e)
                        false
                    }
                }

                @JavascriptInterface
                fun getActiveNotificationBadges(): String {
                    return NodusNotificationListenerService.getNotificationBadgesJson()
                }

                @JavascriptInterface
                fun isNotificationListenerEnabled(): Boolean {
                    return NodusNotificationListenerService.isPermissionGranted(this@LauncherActivity)
                }

                @JavascriptInterface
                fun requestNotificationListenerPermission(): Boolean {
                    return try {
                        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        true
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to open notification listener settings", e)
                        false
                    }
                }
            }, "NodusNativeBridge")

            // Real-time Push of OS Notifications to Frontend
            NodusNotificationListenerService.onNotificationChangeListener = {
                runOnUiThread {
                    try {
                        val json = NodusNotificationListenerService.getNotificationBadgesJson()
                        webView.evaluateJavascript("(function(){ if (window.dispatchEvent) { window.dispatchEvent(new CustomEvent('nodus-notifications-changed', { detail: $json })); } })()", null)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to dispatch notifications to webview", e)
                    }
                }
            }

            webView.webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    if (consoleMessage != null) {
                        Log.d("NodusWebConsole", "[${consoleMessage.messageLevel()}] ${consoleMessage.message()} (at ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()})")
                    }
                    return true
                }

                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    this@LauncherActivity.filePathCallback?.onReceiveValue(null)
                    this@LauncherActivity.filePathCallback = filePathCallback
                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = "image/*"
                    }
                    return try {
                        fileChooserLauncher.launch(intent)
                        true
                    } catch (e: Exception) {
                        this@LauncherActivity.filePathCallback = null
                        false
                    }
                }
            }

            webView.webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    if (request?.url != null) {
                        val response = assetLoader.shouldInterceptRequest(request.url)
                        if (response != null) {
                            return response
                        }
                    }
                    return super.shouldInterceptRequest(view, request)
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    Log.e(TAG, "WebView error on [${request?.url}]: ${error?.description} (code: ${error?.errorCode})")
                }
            }

            // Register package add/remove receiver with Android 14 compatibility
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_PACKAGE_ADDED)
                addAction(Intent.ACTION_PACKAGE_REMOVED)
                addAction(Intent.ACTION_PACKAGE_FULLY_REMOVED)
                addAction(Intent.ACTION_PACKAGE_REPLACED)
                addDataScheme("package")
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(packageChangeReceiver, filter, Context.RECEIVER_EXPORTED)
            } else {
                registerReceiver(packageChangeReceiver, filter)
            }

            // Load local frontend safely through WebViewAssetLoader virtual domain
            val startUrl = "https://appassets.androidplatform.net/assets/frontend/index.html"
            Log.i(TAG, "Loading Launcher UI from: $startUrl")
            webView.loadUrl(startUrl)

        } catch (e: Exception) {
            Log.e(TAG, "Fatal error initializing LauncherActivity WebView", e)
        }
    }

    override fun onResume() {
        super.onResume()
        runOnUiThread {
            webView.evaluateJavascript("(function(){ if (window.dispatchEvent) { window.dispatchEvent(new CustomEvent('nodus-package-changed')); } })()", null)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(packageChangeReceiver)
        } catch (e: Exception) {
            // ignore
        }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        return try {
            val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
                val orig = drawable.bitmap
                if (orig.width > 128 || orig.height > 128) {
                    Bitmap.createScaledBitmap(orig, 128, 128, true)
                } else {
                    orig
                }
            } else {
                val width = if (drawable.intrinsicWidth > 0) Math.min(drawable.intrinsicWidth, 128) else 96
                val height = if (drawable.intrinsicHeight > 0) Math.min(drawable.intrinsicHeight, 128) else 96
                val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bmp)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                bmp
            }

            val baos = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, baos)
            val bytes = baos.toByteArray()
            "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to convert drawable to base64", e)
            ""
        }
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
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Log.w(TAG, "Cannot request battery optimization exemption directly: ${e.message}")
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        webView.evaluateJavascript("(function(){ if (window.dispatchEvent) { window.dispatchEvent(new CustomEvent('nodus-back-press')); } })()", null)
    }
}
