package com.nodus.launcher.service

import android.annotation.SuppressLint
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.webkit.WebViewAssetLoader
import com.nodus.launcher.LauncherActivity
import kotlin.math.abs

class NodusOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var leftHandleView: View? = null
    private var rightHandleView: View? = null
    private var bottomHandleView: View? = null

    private var leftParams: WindowManager.LayoutParams? = null
    private var rightParams: WindowManager.LayoutParams? = null
    private var bottomParams: WindowManager.LayoutParams? = null

    private var activeOverlayWebView: WebView? = null
    private var currentOpenOverlay: String? = null
    private var assetLoader: WebViewAssetLoader? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    companion object {
        const val TAG = "NodusOverlayService"
        var instance: NodusOverlayService? = null

        fun setHandlesVisible(visible: Boolean) {
            instance?.updateVisibility(visible)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        createOverlayHandles()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (leftHandleView == null) {
            createOverlayHandles()
        }
        return START_STICKY
    }

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
    }

    private fun createOverlayHandles() {
        if (!Settings.canDrawOverlays(this)) {
            Log.w(TAG, "SYSTEM_ALERT_WINDOW permission not granted")
            return
        }

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN

        val dm = resources.displayMetrics
        val initialY = (dm.heightPixels * 0.28).toInt()

        // 1. LEFT HANDLE (Device Switcher) - 32dp touch width x 80dp height
        leftParams = WindowManager.LayoutParams(
            dpToPx(32),
            dpToPx(80),
            overlayType,
            flags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.LEFT or Gravity.TOP
            x = 0
            y = initialY
        }

        leftHandleView = createPillView(
            isLeft = true,
            accentColor = Color.parseColor("#34C759")
        )
        setupDoubleTapAndDragListener(leftHandleView!!, leftParams!!, isLeft = true)

        // 2. RIGHT HANDLE (Clipboard History) - 32dp touch width x 80dp height
        rightParams = WindowManager.LayoutParams(
            dpToPx(32),
            dpToPx(80),
            overlayType,
            flags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.RIGHT or Gravity.TOP
            x = 0
            y = initialY
        }

        rightHandleView = createPillView(
            isLeft = false,
            accentColor = Color.parseColor("#007AFF")
        )
        setupDoubleTapAndDragListener(rightHandleView!!, rightParams!!, isLeft = false)

        // 3. BOTTOM HANDLE (Taskbar & Home) - 120dp x 28dp touch area
        bottomParams = WindowManager.LayoutParams(
            dpToPx(120),
            dpToPx(28),
            overlayType,
            flags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            x = 0
            y = dpToPx(4)
        }

        var lastBottomTapTime = 0L
        bottomHandleView = createBottomPillView {
            val now = System.currentTimeMillis()
            if (now - lastBottomTapTime < 380) {
                lastBottomTapTime = 0L
                toggleModularOverlay("taskbar")
            } else {
                lastBottomTapTime = now
            }
        }

        try {
            windowManager?.addView(leftHandleView, leftParams)
            windowManager?.addView(rightHandleView, rightParams)
            windowManager?.addView(bottomHandleView, bottomParams)
            Log.i(TAG, "Overlay handles attached successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach overlay views", e)
        }
    }

    private fun createPillView(isLeft: Boolean, accentColor: Int): View {
        val root = FrameLayout(this).apply {
            isClickable = true
            isFocusable = false
            setBackgroundColor(Color.TRANSPARENT)
            setPadding(if (isLeft) 0 else dpToPx(8), dpToPx(6), if (isLeft) dpToPx(8) else 0, dpToPx(6))
        }

        val innerPill = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                setColor(Color.parseColor("#EE1C1C1E"))
                if (isLeft) {
                    cornerRadii = floatArrayOf(0f, 0f, dpToPx(16).toFloat(), dpToPx(16).toFloat(), dpToPx(16).toFloat(), dpToPx(16).toFloat(), 0f, 0f)
                } else {
                    cornerRadii = floatArrayOf(dpToPx(16).toFloat(), dpToPx(16).toFloat(), 0f, 0f, 0f, 0f, dpToPx(16).toFloat(), dpToPx(16).toFloat())
                }
                setStroke(dpToPx(1), Color.parseColor("#55FFFFFF"))
            }
            background = bg
            elevation = dpToPx(8).toFloat()
        }

        val indicator = View(this).apply {
            val barBg = GradientDrawable().apply {
                setColor(accentColor)
                cornerRadius = dpToPx(4).toFloat()
            }
            background = barBg
        }

        val lp = FrameLayout.LayoutParams(dpToPx(6), dpToPx(36)).apply {
            gravity = if (isLeft) Gravity.START or Gravity.CENTER_VERTICAL else Gravity.END or Gravity.CENTER_VERTICAL
            setMargins(if (isLeft) dpToPx(3) else 0, 0, if (!isLeft) dpToPx(3) else 0, 0)
        }

        innerPill.addView(indicator, lp)
        root.addView(innerPill, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        return root
    }

    private fun createBottomPillView(onTap: () -> Unit): View {
        val root = FrameLayout(this).apply {
            isClickable = true
            isFocusable = false
            setBackgroundColor(Color.TRANSPARENT)
            setPadding(0, dpToPx(6), 0, dpToPx(6))
        }

        val innerPill = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                setColor(Color.parseColor("#CC1C1C1E"))
                cornerRadius = dpToPx(8).toFloat()
                setStroke(dpToPx(1), Color.parseColor("#44FFFFFF"))
            }
            background = bg
            elevation = dpToPx(4).toFloat()
        }

        val bar = View(this).apply {
            val barBg = GradientDrawable().apply {
                setColor(Color.parseColor("#AAFFFFFF"))
                cornerRadius = dpToPx(3).toFloat()
            }
            background = barBg
        }

        val lp = FrameLayout.LayoutParams(dpToPx(64), dpToPx(4)).apply {
            gravity = Gravity.CENTER
        }
        innerPill.addView(bar, lp)
        root.addView(innerPill, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

        root.setOnClickListener {
            onTap()
        }

        return root
    }

    private fun setupDoubleTapAndDragListener(view: View, params: WindowManager.LayoutParams, isLeft: Boolean) {
        var initialParamY = 0
        var initialTouchY = 0f
        var isDrag = false
        var lastTapTime = 0L

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialParamY = params.y
                    initialTouchY = event.rawY
                    isDrag = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val delta = (event.rawY - initialTouchY).toInt()
                    if (abs(delta) > dpToPx(4)) {
                        isDrag = true
                        params.y = (initialParamY + delta).coerceIn(dpToPx(40), resources.displayMetrics.heightPixels - dpToPx(120))
                        try {
                            windowManager?.updateViewLayout(view, params)
                        } catch (_: Exception) {}
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!isDrag) {
                        val now = System.currentTimeMillis()
                        if (now - lastTapTime < 380) {
                            lastTapTime = 0L
                            val targetOverlay = if (isLeft) "devices" else "clipboard"
                            Log.i(TAG, "DOUBLE TAP confirmed on ${if (isLeft) "LEFT" else "RIGHT"} handle -> toggling $targetOverlay")
                            toggleModularOverlay(targetOverlay)
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

    fun toggleModularOverlay(overlayType: String) {
        mainHandler.post {
            if (activeOverlayWebView != null && currentOpenOverlay == overlayType) {
                closeOverlayDirect()
            } else {
                openModularOverlayDirect(overlayType)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun openModularOverlayDirect(overlayType: String) {
        closeOverlayDirect()

        if (!Settings.canDrawOverlays(this)) return

        val overlayTypeFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayTypeFlag,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        val themedContext = ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault_NoActionBar)
        val webView = WebView(themedContext).apply {
            setBackgroundColor(Color.TRANSPARENT)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                cacheMode = WebSettings.LOAD_DEFAULT
                loadWithOverviewMode = true
                useWideViewPort = true
            }

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    Log.d("NodusOverlayConsole", "[${consoleMessage?.messageLevel()}] ${consoleMessage?.message()} (${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()})")
                    return true
                }
            }

            addJavascriptInterface(object {
                @JavascriptInterface
                fun closeOverlay() {
                    mainHandler.post {
                        this@NodusOverlayService.closeOverlayDirect()
                    }
                }

                @JavascriptInterface
                fun copyToClipboard(text: String): Boolean {
                    return try {
                        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                        val clip = android.content.ClipData.newPlainText("Nodus Clipboard", text)
                        cm.setPrimaryClip(clip)
                        mainHandler.post {
                            this@NodusOverlayService.closeOverlayDirect()
                        }
                        true
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to copy to clipboard", e)
                        false
                    }
                }

                @JavascriptInterface
                fun launchApp(packageName: String) {
                    mainHandler.post {
                        this@NodusOverlayService.closeOverlayDirect()
                        try {
                            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                            }
                            if (intent != null) {
                                startActivity(intent)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to launch app $packageName", e)
                        }
                    }
                }

                @JavascriptInterface
                fun bringLauncherToFront() {
                    mainHandler.post {
                        this@NodusOverlayService.closeOverlayDirect()
                        try {
                            val intent = Intent(this@NodusOverlayService, LauncherActivity::class.java).apply {
                                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                        } catch (_: Exception) {}
                    }
                }
            }, "NodusNativeBridge")

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    val response = assetLoader?.shouldInterceptRequest(request.url)
                    if (response != null) {
                        return response
                    }
                    return super.shouldInterceptRequest(view, request)
                }
            }

            loadUrl("https://appassets.androidplatform.net/assets/frontend/index.html#overlay=$overlayType")
        }

        activeOverlayWebView = webView
        currentOpenOverlay = overlayType
        try {
            windowManager?.addView(webView, params)
            Log.i(TAG, "Opened modular overlay: $overlayType")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to add floating overlay window", e)
        }
    }

    private fun closeOverlayDirect() {
        activeOverlayWebView?.let {
            try {
                windowManager?.removeView(it)
                Log.i(TAG, "Closed modular overlay")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to remove overlay view: ${e.message}")
            }
            activeOverlayWebView = null
            currentOpenOverlay = null
        }
    }

    fun closeOverlay() {
        mainHandler.post {
            closeOverlayDirect()
        }
    }

    fun updateVisibility(visible: Boolean) {
        val visibility = if (visible) View.VISIBLE else View.GONE
        leftHandleView?.visibility = visibility
        rightHandleView?.visibility = visibility
        bottomHandleView?.visibility = visibility
        if (!visible) {
            closeOverlay()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        closeOverlay()
        try {
            leftHandleView?.let { windowManager?.removeView(it) }
            rightHandleView?.let { windowManager?.removeView(it) }
            bottomHandleView?.let { windowManager?.removeView(it) }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cleanup overlay views", e)
        }
    }
}
