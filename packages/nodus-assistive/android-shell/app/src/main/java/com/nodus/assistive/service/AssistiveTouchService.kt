package com.nodus.assistive.service

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.app.ActivityOptions
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
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
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import androidx.webkit.WebViewAssetLoader
import com.nodus.assistive.receiver.FleetStateReceiver
import com.nodus.common.NodusIpcContract
import com.nodus.common.NodusModuleDetector
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class AssistiveTouchService : Service() {

    companion object {
        private const val TAG = "AssistiveTouchService"
        private const val NOTIFICATION_ID = 2001
        private const val CHANNEL_ID = "nodus_assistive_touch_channel"

        @Volatile
        var instance: AssistiveTouchService? = null
            private set
    }

    private var windowManager: WindowManager? = null
    private var floatingSquircleView: View? = null
    var overlayWebView: WebView? = null
        private set
    private var isOverlayVisible = false

    private lateinit var squircleLayoutParams: WindowManager.LayoutParams
    private lateinit var overlayLayoutParams: WindowManager.LayoutParams
    private lateinit var assetLoader: WebViewAssetLoader

    private var fleetReceiver: FleetStateReceiver? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        instance = this
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        createNotificationChannel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                buildNotification(),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                buildNotification(),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_NONE
            )
        } else {
            startForeground(NOTIFICATION_ID, buildNotification())
        }

        createFloatingSquircle()
        createOverlayWebView()
        registerFleetReceiver()

        Log.i(TAG, "AssistiveTouchService created with squircle overlay")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (floatingSquircleView == null) {
            createFloatingSquircle()
        }
        if (overlayWebView == null) {
            createOverlayWebView()
        }
        return START_STICKY
    }

    private fun registerFleetReceiver() {
        fleetReceiver = FleetStateReceiver()
        val filter = IntentFilter().apply {
            addAction("com.nodus.assistive.SHOW_OVERLAY")
            addAction("com.nodus.assistive.HIDE_OVERLAY")
            addAction("com.nodus.assistive.TOGGLE_OVERLAY")
            addAction(NodusIpcContract.ACTION_FLEET_STATE_CHANGED)
            addAction(NodusIpcContract.ACTION_CLIPBOARD_CHANGED)
            addAction(NodusIpcContract.ACTION_HOME_SETTINGS_CHANGED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            registerReceiver(fleetReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(fleetReceiver, filter)
        }
    }

    private fun createFloatingSquircle() {
        if (!Settings.canDrawOverlays(this)) return

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val density = resources.displayMetrics.density
        val sizePx = (54 * density).toInt()

        squircleLayoutParams = WindowManager.LayoutParams(
            sizePx,
            sizePx,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (16 * density).toInt()
            y = (resources.displayMetrics.heightPixels * 0.45f).toInt()
        }

        val frame = FrameLayout(this).apply {
            val squircleBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = 16 * density
                setColor(Color.parseColor("#E60F172A")) // Dark frosted slate
                setStroke((1.5 * density).toInt(), Color.parseColor("#38BDF8")) // Cyan-blue accent border
            }
            background = squircleBg
            elevation = 14 * density
        }

        // Center Nodus Grid icon
        val icon = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_agenda)
            setColorFilter(Color.parseColor("#F8FAFC"))
            setPadding((12 * density).toInt(), (12 * density).toInt(), (12 * density).toInt(), (12 * density).toInt())
        }
        val iconParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ).apply {
            gravity = Gravity.CENTER
        }
        frame.addView(icon, iconParams)

        // Accent status glowing dot (top-right)
        val statusDot = View(this).apply {
            val dotBg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#34C759")) // Active green
            }
            background = dotBg
            val dotSize = (8 * density).toInt()
            val dotParams = FrameLayout.LayoutParams(dotSize, dotSize).apply {
                gravity = Gravity.TOP or Gravity.END
                topMargin = (8 * density).toInt()
                rightMargin = (8 * density).toInt()
            }
            layoutParams = dotParams
        }
        frame.addView(statusDot)

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var lastTapTime = 0L

        frame.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = squircleLayoutParams.x
                    initialY = squircleLayoutParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    frame.alpha = 1.0f
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    squircleLayoutParams.x = initialX + (event.rawX - initialTouchX).toInt()
                    squircleLayoutParams.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager?.updateViewLayout(floatingSquircleView, squircleLayoutParams)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    val dx = Math.abs(event.rawX - initialTouchX)
                    val dy = Math.abs(event.rawY - initialTouchY)
                    if (dx < 14 && dy < 14) {
                        val currentTime = System.currentTimeMillis()
                        if (currentTime - lastTapTime < 400) {
                            v.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                            toggleOverlay()
                            lastTapTime = 0L
                        } else {
                            v.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                            lastTapTime = currentTime
                        }
                    } else {
                        // Edge snap to closest side (left or right)
                        val screenWidth = resources.displayMetrics.widthPixels
                        val targetX = if (squircleLayoutParams.x + sizePx / 2 < screenWidth / 2) {
                            (12 * density).toInt()
                        } else {
                            screenWidth - sizePx - (12 * density).toInt()
                        }
                        squircleLayoutParams.x = targetX
                        windowManager?.updateViewLayout(floatingSquircleView, squircleLayoutParams)
                    }
                    true
                }
                else -> false
            }
        }

        floatingSquircleView = frame
        windowManager?.addView(floatingSquircleView, squircleLayoutParams)
    }

    private fun handleDoubleTap() {
        toggleOverlay()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createOverlayWebView() {
        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        overlayLayoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
        }

        overlayWebView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            setBackgroundColor(Color.TRANSPARENT)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        Log.d("NodusAssistiveConsole", "[${it.messageLevel()}] ${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}")
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
                    Log.i(TAG, "Overlay WebView ready: $url")
                }

                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    super.onReceivedError(view, request, error)
                    Log.e(TAG, "Assistive WebView error on [${request?.url}]: ${error?.description}")
                }
            }

            addJavascriptInterface(AssistiveNativeBridge(this@AssistiveTouchService), "NodusNativeBridge")
        }
        overlayWebView?.loadUrl("https://appassets.androidplatform.net/assets/frontend/index.html")
    }

    fun toggleOverlay() {
        if (isOverlayVisible) {
            hideOverlay()
        } else {
            showOverlay()
        }
    }

    fun showOverlay() {
        if (isOverlayVisible || overlayWebView == null) return
        try {
            windowManager?.addView(overlayWebView, overlayLayoutParams)
            isOverlayVisible = true
            floatingSquircleView?.visibility = View.GONE
        } catch (e: Exception) {
            Log.e(TAG, "Error showing overlay: ${e.message}")
        }
    }

    fun hideOverlay() {
        if (!isOverlayVisible || overlayWebView == null) return
        try {
            windowManager?.removeView(overlayWebView)
            isOverlayVisible = false
            floatingSquircleView?.visibility = View.VISIBLE
        } catch (e: Exception) {
            Log.e(TAG, "Error hiding overlay: ${e.message}")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Nodus Assistive Touch",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Persistent floating assistive overlay service"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Nodus Touch")
            .setContentText("Universal overlay taskbar is active")
            .setSmallIcon(android.R.drawable.ic_menu_agenda)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        hideOverlay()
        floatingSquircleView?.let { windowManager?.removeView(it) }
        floatingSquircleView = null
        overlayWebView?.destroy()
        overlayWebView = null
        fleetReceiver?.let { unregisterReceiver(it) }
        instance = null
    }

    inner class AssistiveNativeBridge(private val context: Context) {

        @JavascriptInterface
        fun closeOverlay() {
            mainHandler.post { hideOverlay() }
        }

        @JavascriptInterface
        fun isHomeInstalled(): Boolean = NodusModuleDetector.isHomeInstalled(context)

        @JavascriptInterface
        fun isFleetInstalled(): Boolean = NodusModuleDetector.isFleetInstalled(context)

        @JavascriptInterface
        fun queryHomeSettings(): String {
            return try {
                val uri = Uri.parse("content://${NodusIpcContract.HOME_AUTHORITY}/${NodusIpcContract.PATH_SETTINGS}")
                val cursor = context.contentResolver.query(uri, null, null, null, null)
                cursor?.use {
                    if (it.moveToFirst()) it.getString(0) ?: "{}" else "{}"
                } ?: "{}"
            } catch (e: Exception) {
                Log.w(TAG, "Error querying home settings: ${e.message}")
                "{}"
            }
        }

        @JavascriptInterface
        fun queryFleetDevices(): String {
            return try {
                val uri = Uri.parse("content://${NodusIpcContract.FLEET_AUTHORITY}/${NodusIpcContract.PATH_DEVICES}")
                val cursor = context.contentResolver.query(uri, null, null, null, null)
                cursor?.use {
                    if (it.moveToFirst()) it.getString(0) ?: "[]" else "[]"
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
                    if (it.moveToFirst()) it.getString(0) ?: "[]" else "[]"
                } ?: "[]"
            } catch (e: Exception) {
                Log.w(TAG, "Error querying fleet clipboard: ${e.message}")
                "[]"
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
        fun launchApp(packageName: String, launchMode: String? = "fullscreen") {
            try {
                val pm = context.packageManager
                val intent = pm.getLaunchIntentForPackage(packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }
                if (intent != null) {
                    if (launchMode == "floating") {
                        intent.putExtra("miui.intent.extra.open_in_floating_window", true)
                        intent.putExtra("miui.intent.extra.floating_window", true)
                        intent.putExtra("miui.intent.extra.drag_to_floating_window", true)
                        intent.putExtra("android.intent.extra.WINDOW_MODE", 5)

                        val dm = context.resources.displayMetrics
                        val width = (dm.widthPixels * 0.68).toInt()
                        val height = (dm.heightPixels * 0.72).toInt()
                        val left = (dm.widthPixels - width) / 2
                        val top = (dm.heightPixels - height) / 2
                        val bounds = Rect(left, top, left + width, top + height)

                        val options = ActivityOptions.makeBasic()
                        options.setLaunchBounds(bounds)

                        val bundle = options.toBundle() ?: Bundle()
                        bundle.putInt("android:activity.launchWindowingMode", 5)
                        bundle.putInt("android.activity.windowingMode", 5)
                        bundle.putInt("android:activity.windowingMode", 5)
                        bundle.putParcelable("android:activity.launchBounds", bounds)
                        bundle.putParcelable("android.activity.launchBounds", bounds)
                        bundle.putBoolean("miui.intent.extra.open_in_floating_window", true)
                        bundle.putBoolean("miui.intent.extra.floating_window", true)

                        context.startActivity(intent, bundle)
                    } else {
                        context.startActivity(intent)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch package: $packageName", e)
            }
            mainHandler.post { hideOverlay() }
        }

        @JavascriptInterface
        fun launchAppFloating(packageName: String) {
            launchApp(packageName, "floating")
        }

        @JavascriptInterface
        fun copyToClipboard(text: String) {
            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("Nodus Clipboard", text)
            cm.setPrimaryClip(clip)
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
