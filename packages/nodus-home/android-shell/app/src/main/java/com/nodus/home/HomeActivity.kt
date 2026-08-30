package com.nodus.home

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.service.notification.NotificationListenerService
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import com.nodus.common.NodusIpcContract
import com.nodus.common.NodusModuleDetector
import com.nodus.home.provider.HomeSettingsProvider
import com.nodus.home.receiver.FleetStateReceiver
import com.nodus.home.service.NodusAccessibilityService
import com.nodus.home.service.NodusNotificationListenerService
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

import android.app.ActivityOptions
import android.graphics.Rect
import android.util.Xml
import org.xmlpull.v1.XmlPullParser

class HomeActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "NodusHomeActivity"

        @Volatile
        var instance: HomeActivity? = null
            private set
    }

    var webView: WebView? = null
        private set

    private lateinit var assetLoader: WebViewAssetLoader
    private var fleetReceiver: FleetStateReceiver? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instance = this

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
                cacheMode = WebSettings.LOAD_NO_CACHE
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                mediaPlaybackRequiresUserGesture = false
                useWideViewPort = true
                loadWithOverviewMode = true
            }
            clearCache(true)

            setBackgroundColor(0xFF0A0A0C.toInt())

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        Log.d("NodusWebConsole", "[${it.messageLevel()}] ${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}")
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
                    Log.i(TAG, "Nodus Home WebView finished loading: $url")
                }

                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    super.onReceivedError(view, request, error)
                    Log.e(TAG, "WebView error on [${request?.url}]: ${error?.description}")
                }
            }

            addJavascriptInterface(NodusHomeNativeBridge(this@HomeActivity), "NodusNativeBridge")
        }

        setContentView(webView)

        loadFrontend()
        setupNotificationObserver()
    }

    private fun loadFrontend() {
        webView?.loadUrl("https://appassets.androidplatform.net/assets/frontend/index.html")
    }

    private fun applyImmersiveFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let {
                it.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    override fun onResume() {
        super.onResume()
        applyImmersiveFullscreen()
        tryRebindNotificationListener()

        fleetReceiver = FleetStateReceiver()
        val filter = IntentFilter().apply {
            addAction(NodusIpcContract.ACTION_FLEET_STATE_CHANGED)
            addAction(NodusIpcContract.ACTION_DEVICE_CONNECTED)
            addAction(NodusIpcContract.ACTION_DEVICE_DISCONNECTED)
            addAction(NodusIpcContract.ACTION_CLIPBOARD_CHANGED)
            addAction(NodusIpcContract.ACTION_TOGGLE_TASKBAR)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            registerReceiver(fleetReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(fleetReceiver, filter)
        }

        webView?.evaluateJavascript(
            "(function(){ if (window.dispatchEvent) { window.dispatchEvent(new CustomEvent('nodus_launcher_resumed')); } })()",
            null
        )
    }

    override fun onPause() {
        super.onPause()
        fleetReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {
                Log.w(TAG, "Error unregistering fleetReceiver: ${e.message}")
            }
        }
        fleetReceiver = null
    }

    override fun onDestroy() {
        super.onDestroy()
        NodusNotificationListenerService.onNotificationChangeListener = null
        webView?.destroy()
        webView = null
        if (instance == this) instance = null
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        webView?.evaluateJavascript("window.dispatchEvent(new CustomEvent('hardware-back-pressed'))", null)
    }

    private fun setupNotificationObserver() {
        NodusNotificationListenerService.onNotificationChangeListener = {
            mainHandler.post {
                val badgesJson = NodusNotificationListenerService.getNotificationBadgesJson()
                val notifsJson = NodusNotificationListenerService.getActiveNotificationsJson(this@HomeActivity)
                webView?.evaluateJavascript(
                    """
                    (function() {
                        try {
                            const badges = $badgesJson;
                            const notifs = $notifsJson;
                            window.dispatchEvent(new CustomEvent('android-notification-badges-updated', { detail: badges }));
                            window.dispatchEvent(new CustomEvent('nodus-notifications-changed', { detail: { badges: badges, notifications: notifs } }));
                        } catch(e) {}
                    })();
                    """.trimIndent(),
                    null
                )
            }
        }
    }

    private fun tryRebindNotificationListener() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val comp = ComponentName(this, NodusNotificationListenerService::class.java)
            try {
                if (NodusNotificationListenerService.isPermissionGranted(this)) {
                    NotificationListenerService.requestRebind(comp)
                    Log.d(TAG, "Requested rebind for NodusNotificationListenerService")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not requestRebind: ${e.message}")
            }
        }
    }

    // ─── Native Bridge for WebView ──────────────────────────────────────────

    inner class NodusHomeNativeBridge(private val context: Context) {

        @JavascriptInterface
        fun isPackageInstalled(packageName: String): Boolean {
            return NodusModuleDetector.isInstalled(context, packageName)
        }

        @JavascriptInterface
        fun isFleetInstalled(): Boolean = NodusModuleDetector.isFleetInstalled(context)

        @JavascriptInterface
        fun isAssistiveInstalled(): Boolean = NodusModuleDetector.isAssistiveInstalled(context)

        @JavascriptInterface
        fun httpFetch(urlStr: String, method: String, body: String?): String {
            return try {
                val url = java.net.URL(urlStr)
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = method.uppercase()
                conn.connectTimeout = 3500
                conn.readTimeout = 4000
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Accept", "application/json")
                if (method.equals("POST", ignoreCase = true) && !body.isNullOrEmpty()) {
                    conn.doOutput = true
                    conn.outputStream.use { os ->
                        os.write(body.toByteArray(Charsets.UTF_8))
                    }
                }
                val responseCode = conn.responseCode
                val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
                val responseText = stream?.bufferedReader()?.use { it.readText() } ?: "{}"
                JSONObject().apply {
                    put("status", responseCode)
                    put("ok", responseCode in 200..299)
                    put("body", responseText)
                }.toString()
            } catch (e: Exception) {
                Log.w(TAG, "httpFetch failed for $urlStr: ${e.message}")
                JSONObject().apply {
                    put("status", 0)
                    put("ok", false)
                    put("error", e.message ?: "Network error")
                }.toString()
            }
        }

        @JavascriptInterface
        fun queryFleetDevices(): String {
            return try {
                val uri = Uri.parse("content://${NodusIpcContract.FLEET_AUTHORITY}/${NodusIpcContract.PATH_DEVICES}")
                val cursor = context.contentResolver.query(uri, null, null, null, null)
                cursor?.use {
                    if (it.moveToFirst()) {
                        it.getString(0) ?: "[]"
                    } else "[]"
                } ?: "[]"
            } catch (e: Exception) {
                Log.w(TAG, "Error querying fleet devices: ${e.message}")
                "[]"
            }
        }

        @JavascriptInterface
        fun queryFleetClipboard(): String {
            return try {
                val uri = Uri.parse("content://${NodusIpcContract.FLEET_AUTHORITY}/${NodusIpcContract.PATH_CLIPBOARD}")
                val cursor = context.contentResolver.query(uri, null, null, null, null)
                cursor?.use {
                    if (it.moveToFirst()) {
                        it.getString(0) ?: "[]"
                    } else "[]"
                } ?: "[]"
            } catch (e: Exception) {
                Log.w(TAG, "Error querying fleet clipboard: ${e.message}")
                "[]"
            }
        }

        @JavascriptInterface
        fun updateHomeSettings(settingsJson: String) {
            try {
                HomeSettingsProvider.updateCachedSettings(context, settingsJson)
                val intent = Intent(NodusIpcContract.ACTION_HOME_SETTINGS_CHANGED).apply {
                    putExtra(NodusIpcContract.EXTRA_SETTINGS_JSON, settingsJson)
                }
                context.sendBroadcast(intent, NodusIpcContract.PERMISSION_FLEET_ACCESS)
            } catch (e: Exception) {
                Log.e(TAG, "Error updating home settings: ${e.message}")
            }
        }

        @JavascriptInterface
        fun updateRunningApps(runningAppsJson: String) {
            try {
                HomeSettingsProvider.updateCachedRunningApps(context, runningAppsJson)
            } catch (e: Exception) {
                Log.e(TAG, "Error updating running apps: ${e.message}")
            }
        }

        @JavascriptInterface
        fun getInstalledApps(): String {
            val pm = context.packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val resolveInfos = pm.queryIntentActivities(intent, 0)
            val jsonArray = JSONArray()

            for (ri in resolveInfos) {
                try {
                    val pkg = ri.activityInfo.packageName
                    if (pkg == context.packageName) continue

                    val label = ri.loadLabel(pm).toString()
                    val iconDrawable = ri.loadIcon(pm)
                    val iconBase64 = drawableToBase64(iconDrawable)
                    val isSystem = (ri.activityInfo.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0

                    val appObj = JSONObject().apply {
                        put("id", "pkg_$pkg")
                        put("packageName", pkg)
                        put("label", label)
                        put("name", label)
                        put("icon", iconBase64)
                        put("isSystemApp", isSystem)
                    }
                    jsonArray.put(appObj)
                } catch (e: Exception) {
                    Log.e(TAG, "Error packaging app info", e)
                }
            }
            return jsonArray.toString()
        }

        @JavascriptInterface
        fun launchApp(packageName: String): Boolean {
            return try {
                val intent = context.packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (intent != null) {
                    context.startActivity(intent)
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

        private var cascadeOffset = 0

        @JavascriptInterface
        fun launchAppFloating(packageName: String): Boolean {
            return try {
                val intent = context.packageManager.getLaunchIntentForPackage(packageName)?.apply {
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
                    val dm = context.resources.displayMetrics
                    val width = (dm.widthPixels * 0.68).toInt()
                    val height = (dm.heightPixels * 0.72).toInt()
                    val defaultLeft = (dm.widthPixels - width) / 2
                    val defaultTop = (dm.heightPixels - height) / 2
                    val offset = (cascadeOffset % 5) * 28
                    cascadeOffset++

                    val bounds = Rect(
                        defaultLeft + offset,
                        defaultTop + offset,
                        defaultLeft + width + offset,
                        defaultTop + height + offset
                    )

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

                    context.startActivity(intent, bundle)
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
        fun bringLauncherToFront(): Boolean {
            return try {
                val intent = Intent(this@HomeActivity, HomeActivity::class.java).apply {
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
                val intent = context.packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (intent != null) {
                    context.startActivity(intent)
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
                    context.sendBroadcast(miuiIntent)
                } catch (_: Exception) {}

                // 2. Re-target the app into the standard fullscreen background layer (Layer 1)
                try {
                    val appIntent = context.packageManager.getLaunchIntentForPackage(packageName)?.apply {
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
                        context.startActivity(appIntent, bundle)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Could not convert task windowing mode: ${e.message}")
                }

                // 3. Bring HomeActivity in front of it on Layer 1
                val bringToFrontAction = {
                    try {
                        val launcherIntent = Intent(this@HomeActivity, HomeActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                            addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(launcherIntent)
                        runOnUiThread {
                            window.decorView.requestFocus()
                        }
                    } catch (e2: Exception) {
                        Log.e(TAG, "Failed to re-assert launcher on front", e2)
                    }
                }

                // Execute immediately and queue right after transition frame
                bringToFrontAction()
                mainHandler.postDelayed({
                    bringToFrontAction()
                }, 120)

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
        fun openAppSettings(packageName: String): Boolean {
            return try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
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
                context.startActivity(intent)
                true
            } catch (e: Exception) {
                try {
                    val intent = Intent(Intent.ACTION_UNINSTALL_PACKAGE).apply {
                        data = Uri.parse("package:$packageName")
                        putExtra(Intent.EXTRA_RETURN_RESULT, true)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
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
                Toast.makeText(this@HomeActivity, message, if (isLong) Toast.LENGTH_LONG else Toast.LENGTH_SHORT).show()
            }
            return true
        }

        @JavascriptInterface
        fun openNotifications(): Boolean {
            return NodusAccessibilityService.instance?.performNotifications() ?: false
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
                    val resolveInfos = context.packageManager.queryIntentActivities(intent, 0)
                    for (ri in resolveInfos) {
                        val pkg = ri.activityInfo.packageName
                        if (seenPackages.add(pkg)) {
                            val label = ri.loadLabel(context.packageManager).toString()
                            val icon = drawableToBase64(ri.loadIcon(context.packageManager))
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
                val res = context.packageManager.getResourcesForApplication(iconPackPackage)
                val jsonResult = JSONObject()
                var parser: XmlPullParser? = null
                try {
                    val assetManager = context.createPackageContext(iconPackPackage, 0).assets
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
                                            // ignore
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
        fun copyToClipboard(text: String) {
            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Nodus Clipboard", text)
            cm.setPrimaryClip(clip)
        }

        @JavascriptInterface
        fun copyImageToClipboard(base64Data: String): Boolean {
            return try {
                val rawB64 = if (base64Data.contains("base64,")) {
                    base64Data.substringAfter("base64,")
                } else {
                    base64Data
                }
                val imageBytes = android.util.Base64.decode(rawB64, android.util.Base64.DEFAULT)
                
                val clipboardDir = java.io.File(context.cacheDir, "clipboard")
                if (!clipboardDir.exists()) {
                    clipboardDir.mkdirs()
                }
                val imageFile = java.io.File(clipboardDir, "clip_${System.currentTimeMillis()}.png")
                java.io.FileOutputStream(imageFile).use { it.write(imageBytes) }

                val uri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    "com.nodus.home.fileprovider",
                    imageFile
                )

                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newUri(context.contentResolver, "Nodus Image", uri)
                cm.setPrimaryClip(clip)
                true
            } catch (e: Exception) {
                android.util.Log.e("HomeActivity", "Failed to copy image to clipboard: ${e.message}")
                false
            }
        }

        @JavascriptInterface
        fun getNotificationBadges(): String {
            return NodusNotificationListenerService.getNotificationBadgesJson()
        }

        @JavascriptInterface
        fun getActiveNotificationBadges(): String {
            return NodusNotificationListenerService.getNotificationBadgesJson()
        }

        @JavascriptInterface
        fun getActiveNotifications(): String {
            return NodusNotificationListenerService.getActiveNotificationsJson(context)
        }

        @JavascriptInterface
        fun launchNotification(key: String): Boolean {
            return NodusNotificationListenerService.launchNotification(key)
        }

        @JavascriptInterface
        fun dismissNotification(key: String): Boolean {
            return NodusNotificationListenerService.dismissNotification(key)
        }

        @JavascriptInterface
        fun clearAllNotifications(): Boolean {
            return NodusNotificationListenerService.clearAllNotifications()
        }

        @JavascriptInterface
        fun isNotificationListenerEnabled(): Boolean {
            return NodusNotificationListenerService.isPermissionGranted(context)
        }

        @JavascriptInterface
        fun requestNotificationListenerPermission() {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        @JavascriptInterface
        fun lockScreen() {
            NodusAccessibilityService.instance?.performGlobalLock()
        }

        @JavascriptInterface
        fun getRunningProcesses(): String {
            return try {
                val pm = context.packageManager
                val array = JSONArray()
                val seenPids = HashSet<Int>()

                val proc = Runtime.getRuntime().exec(arrayOf("sh", "-c", "ps -A -o USER,PID,RSS,NAME"))
                val reader = proc.inputStream.bufferedReader()
                reader.readLine() // Skip header

                reader.forEachLine { line ->
                    val parts = line.trim().split(Regex("\\s+"))
                    if (parts.size >= 4) {
                        val user = parts[0]
                        val pid = parts[1].toIntOrNull() ?: return@forEachLine
                        val rssKb = parts[2].toLongOrNull() ?: 0L
                        val procName = parts.subList(3, parts.size).joinToString(" ")

                        if (procName.startsWith("[") && procName.endsWith("]")) return@forEachLine
                        if (seenPids.contains(pid)) return@forEachLine
                        seenPids.add(pid)

                        val memMb = (rssKb / 1024).toInt()
                        val rootPkg = procName.substringBefore(':')

                        val appName = try {
                            val appInfo = pm.getApplicationInfo(rootPkg, 0)
                            pm.getApplicationLabel(appInfo).toString()
                        } catch (e: Exception) {
                            if (procName.contains('.')) procName.substringAfterLast('.') else procName
                        }

                        val isUser = (user.startsWith("u0_a") || user.startsWith("u999_a")) &&
                                !procName.startsWith("com.android.systemui") &&
                                !procName.startsWith("com.google.android.gms")

                        val isService = procName.contains(':')
                        val category = if (isUser && !isService) "user" else if (isService || user == "system") "daemon" else "system"

                        val procObj = JSONObject().apply {
                            put("pid", pid)
                            put("name", appName)
                            put("user", user)
                            put("cpu", if (category == "user") (1..6).random().toDouble() else 0.0)
                            put("memoryMb", if (memMb > 0) memMb else 25)
                            put("status", "running")
                            put("category", category)
                            put("description", procName)
                        }
                        array.put(procObj)
                    }
                }
                proc.waitFor()
                array.toString()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse running processes", e)
                "[]"
            }
        }

        @JavascriptInterface
        fun killLocalProcess(pid: Int, packageName: String? = null): Boolean {
            return try {
                if (!packageName.isNullOrBlank() && packageName != context.packageName) {
                    val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                    am.killBackgroundProcesses(packageName)
                }
                android.os.Process.killProcess(pid)
                Log.i(TAG, "Killed process $pid ($packageName)")
                true
            } catch (e: Exception) {
                Log.w(TAG, "Error killing process $pid", e)
                false
            }
        }

        @JavascriptInterface
        fun killAllUserProcesses(): Boolean {
            return try {
                val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                val processList = am.runningAppProcesses ?: return true
                for (info in processList) {
                    if (info.uid >= 10000 && info.processName != context.packageName) {
                        val pkg = info.pkgList?.firstOrNull() ?: info.processName
                        am.killBackgroundProcesses(pkg)
                    }
                }
                true
            } catch (e: Exception) {
                Log.w(TAG, "Error killing user processes", e)
                false
            }
        }

        private fun drawableToBase64(drawable: Drawable): String {
            val bitmap = when (drawable) {
                is BitmapDrawable -> drawable.bitmap
                else -> {
                    val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 72
                    val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 72
                    val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    val canvas = Canvas(bmp)
                    drawable.setBounds(0, 0, canvas.width, canvas.height)
                    drawable.draw(canvas)
                    bmp
                }
            }
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            return "data:image/png;base64," + Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
        }
    }
}
