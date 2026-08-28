package com.nodus.launcher.service

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.webkit.*
import android.widget.FrameLayout
import androidx.webkit.WebViewAssetLoader
import com.nodus.launcher.LauncherActivity
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import kotlin.math.abs

class NodusAssistiveTouchService : Service() {

    private var windowManager: WindowManager? = null
    private var floatCircleView: View? = null
    private var circleParams: WindowManager.LayoutParams? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var snapAnimator: ValueAnimator? = null

    private var taskbarOverlayView: View? = null
    private var taskbarWebView: WebView? = null

    private val idleRunnable = Runnable {
        floatCircleView?.animate()
            ?.alpha(0.55f)
            ?.scaleX(0.92f)
            ?.scaleY(0.92f)
            ?.setDuration(400)
            ?.start()
    }

    companion object {
        const val TAG = "NodusAssistiveTouch"
        var instance: NodusAssistiveTouchService? = null

        fun isRunning(): Boolean = instance != null
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createFloatingAssistiveCircle()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (floatCircleView == null) {
            createFloatingAssistiveCircle()
        }
        return START_STICKY
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun createFloatingAssistiveCircle() {
        if (floatCircleView != null) return

        if (!Settings.canDrawOverlays(this)) {
            Log.w(TAG, "SYSTEM_ALERT_WINDOW permission not granted for Assistive Touch")
            return
        }

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val dm = resources.displayMetrics
        val density = dm.density
        val sizePx = (52 * density).toInt()

        val params = WindowManager.LayoutParams(
            sizePx,
            sizePx,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (12 * density).toInt()
            y = (dm.heightPixels * 0.45f).toInt()
        }
        circleParams = params

        val container = FrameLayout(this).apply {
            clipChildren = false
            clipToPadding = false
        }

        val outerGlow = View(this).apply {
            val gd = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#4434C759"))
            }
            background = gd
            alpha = 0.6f
        }
        val glowPad = (6 * density).toInt()
        val glowParams = FrameLayout.LayoutParams(sizePx, sizePx).apply {
            gravity = Gravity.CENTER
        }
        container.addView(outerGlow, glowParams)

        val circleCore = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#E6121216"))
                setStroke((1.5f * density).toInt(), Color.parseColor("#8034C759"))
            }
            background = bg
            elevation = 12f * density
        }
        val coreSize = (44 * density).toInt()
        val coreParams = FrameLayout.LayoutParams(coreSize, coreSize).apply {
            gravity = Gravity.CENTER
        }

        val dot = View(this).apply {
            val dotBg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#34C759"))
            }
            background = dotBg
        }
        val dotSize = (14 * density).toInt()
        val dotParams = FrameLayout.LayoutParams(dotSize, dotSize).apply {
            gravity = Gravity.CENTER
        }
        circleCore.addView(dot, dotParams)

        val ring = View(this).apply {
            val ringBg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.TRANSPARENT)
                setStroke((1.2f * density).toInt(), Color.parseColor("#6634C759"))
            }
            background = ringBg
        }
        val ringSize = (26 * density).toInt()
        val ringParams = FrameLayout.LayoutParams(ringSize, ringSize).apply {
            gravity = Gravity.CENTER
        }
        circleCore.addView(ring, ringParams)

        container.addView(circleCore, coreParams)

        setupTouchHandling(container, params)

        try {
            windowManager?.addView(container, params)
            floatCircleView = container
            resetIdleTimer()
            Log.i(TAG, "Floating Assistive Circle attached successfully at (${params.x}, ${params.y})")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach Floating Assistive Circle", e)
        }
    }

    private fun resetIdleTimer() {
        mainHandler.removeCallbacks(idleRunnable)
        floatCircleView?.animate()
            ?.alpha(1.0f)
            ?.scaleX(1.0f)
            ?.scaleY(1.0f)
            ?.setDuration(180)
            ?.start()
        mainHandler.postDelayed(idleRunnable, 3500)
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupTouchHandling(view: View, params: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isDragging = false
        var lastTapTime = 0L

        view.setOnTouchListener { _, event ->
            resetIdleTimer()

            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    snapAnimator?.cancel()
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false

                    view.animate()
                        .scaleX(1.18f)
                        .scaleY(1.18f)
                        .setDuration(120)
                        .setInterpolator(DecelerateInterpolator())
                        .start()

                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - initialTouchX
                    val dy = event.rawY - initialTouchY

                    if (abs(dx) > 10 || abs(dy) > 10) {
                        isDragging = true
                    }

                    if (isDragging) {
                        params.x = (initialX + dx).toInt()
                        params.y = (initialY + dy).toInt()
                        try {
                            windowManager?.updateViewLayout(view, params)
                        } catch (_: Exception) {}
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    view.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .setDuration(150)
                        .start()

                    val dm = resources.displayMetrics
                    val screenWidth = dm.widthPixels
                    val screenHeight = dm.heightPixels
                    val density = dm.density
                    val margin = (8 * density).toInt()

                    if (isDragging) {
                        val currentCenterX = params.x + (view.width / 2)
                        val snapToLeft = currentCenterX < (screenWidth / 2)
                        val targetX = if (snapToLeft) margin else (screenWidth - view.width - margin)
                        val targetY = params.y.coerceIn(margin * 2, screenHeight - view.height - margin * 3)

                        animateSnap(view, params, params.x, params.y, targetX, targetY)
                    } else {
                        val now = System.currentTimeMillis()
                        if (now - lastTapTime < 380) {
                            lastTapTime = 0L
                            
                            view.animate()
                                .scaleX(1.35f)
                                .scaleY(1.35f)
                                .setDuration(120)
                                .withEndAction {
                                    view.animate().scaleX(1.0f).scaleY(1.0f).setDuration(180).start()
                                }
                                .start()

                            onAssistiveCircleDoubleTap()
                        } else {
                            lastTapTime = now
                        }
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun animateSnap(
        view: View,
        params: WindowManager.LayoutParams,
        startX: Int,
        startY: Int,
        targetX: Int,
        targetY: Int
    ) {
        snapAnimator?.cancel()
        snapAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 280
            interpolator = OvershootInterpolator(0.85f)
            addUpdateListener { anim ->
                val fraction = anim.animatedFraction
                params.x = (startX + (targetX - startX) * fraction).toInt()
                params.y = (startY + (targetY - startY) * fraction).toInt()
                try {
                    windowManager?.updateViewLayout(view, params)
                } catch (_: Exception) {}
            }
            start()
        }
    }

    private fun onAssistiveCircleDoubleTap() {
        Log.i(TAG, "DOUBLE TAP detected on Assistive Circle. Foreground resumed=${LauncherActivity.isForegroundResumed}")
        if (LauncherActivity.isForegroundResumed && LauncherActivity.instance != null) {
            LauncherActivity.instance?.toggleDesktopTaskbar()
        } else {
            toggleTaskbarOverlay()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun toggleTaskbarOverlay() {
        if (taskbarOverlayView != null) {
            hideTaskbarOverlay()
        } else {
            showTaskbarOverlay()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun showTaskbarOverlay() {
        if (taskbarOverlayView != null) return
        if (!Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Cannot show Taskbar Overlay: SYSTEM_ALERT_WINDOW not granted")
            return
        }

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val flags = WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayType,
            flags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        val wv = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            val assetLoader = WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this@NodusAssistiveTouchService))
                .build()

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                    return request?.url?.let { assetLoader.shouldInterceptRequest(it) }
                }
            }

            addJavascriptInterface(object {
                @JavascriptInterface
                fun closeOverlay() {
                    mainHandler.post { hideTaskbarOverlay() }
                }

                @JavascriptInterface
                fun launchApp(packageName: String): Boolean {
                    mainHandler.post { hideTaskbarOverlay() }
                    return try {
                        val pm = packageManager
                        val intent = pm.getLaunchIntentForPackage(packageName)?.apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (intent != null) {
                            startActivity(intent)
                            true
                        } else false
                    } catch (e: Exception) {
                        false
                    }
                }

                @JavascriptInterface
                fun getInstalledApps(): String {
                    return queryInstalledAppsList()
                }

                @JavascriptInterface
                fun copyToClipboard(text: String): Boolean {
                    return try {
                        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                        val clip = android.content.ClipData.newPlainText("Nodus Clipboard", text)
                        clipboard.setPrimaryClip(clip)
                        true
                    } catch (e: Exception) {
                        false
                    }
                }

                @JavascriptInterface
                fun getClipboardHistory(): String {
                    return "[]"
                }

                @JavascriptInterface
                fun getActiveNotificationBadges(): String {
                    return NodusNotificationListenerService.getNotificationBadgesJson()
                }
            }, "NodusNativeBridge")

            loadUrl("https://appassets.androidplatform.net/assets/frontend/index.html#overlay=taskbar")
        }

        taskbarWebView = wv
        taskbarOverlayView = wv

        try {
            windowManager?.addView(wv, params)
            Log.i(TAG, "Floating Taskbar Overlay attached successfully over active app")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach Floating Taskbar Overlay", e)
        }
    }

    fun hideTaskbarOverlay() {
        taskbarOverlayView?.let {
            try {
                windowManager?.removeView(it)
            } catch (e: Exception) {
                Log.w(TAG, "Error removing taskbar overlay view", e)
            }
        }
        taskbarWebView?.destroy()
        taskbarWebView = null
        taskbarOverlayView = null
        Log.i(TAG, "Floating Taskbar Overlay dismissed")
    }

    private fun queryInstalledAppsList(): String {
        return try {
            val pm = packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
            } else {
                @Suppress("DEPRECATION")
                pm.queryIntentActivities(intent, 0)
            }

            val jsonArray = JSONArray()
            for (ri in resolveInfos) {
                val pkg = ri.activityInfo.packageName
                if (pkg == packageName) continue

                val label = ri.loadLabel(pm).toString()
                val iconDrawable = ri.loadIcon(pm)
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
            jsonArray.toString()
        } catch (e: Exception) {
            "[]"
        }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        return try {
            val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
                drawable.bitmap
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
            ""
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        mainHandler.removeCallbacks(idleRunnable)
        snapAnimator?.cancel()
        hideTaskbarOverlay()
        try {
            floatCircleView?.let { windowManager?.removeView(it) }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cleanup assistive circle view", e)
        }
    }
}
