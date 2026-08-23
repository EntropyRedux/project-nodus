package com.nodus.launcher.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
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
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS

        val dm = resources.displayMetrics
        val initialY = (dm.heightPixels * 0.28).toInt()

        // 1. LEFT HANDLE (Device Switcher)
        leftParams = WindowManager.LayoutParams(
            dpToPx(14),
            dpToPx(56),
            overlayType,
            flags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.START or Gravity.TOP
            x = 0
            y = initialY
        }

        leftHandleView = createPillView(
            isLeft = true,
            accentColor = Color.parseColor("#34C759")
        ) {
            openNodusPanel("device_switcher")
        }

        setupDragListener(leftHandleView!!, leftParams!!, isLeft = true)

        // 2. RIGHT HANDLE (Clipboard History)
        rightParams = WindowManager.LayoutParams(
            dpToPx(14),
            dpToPx(56),
            overlayType,
            flags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.END or Gravity.TOP
            x = 0
            y = initialY
        }

        rightHandleView = createPillView(
            isLeft = false,
            accentColor = Color.parseColor("#007AFF")
        ) {
            openNodusPanel("clipboard")
        }

        setupDragListener(rightHandleView!!, rightParams!!, isLeft = false)

        // 3. BOTTOM HANDLE (Taskbar & Home)
        bottomParams = WindowManager.LayoutParams(
            dpToPx(80),
            dpToPx(10),
            overlayType,
            flags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            x = 0
            y = dpToPx(4)
        }

        bottomHandleView = createBottomPillView {
            openNodusPanel("taskbar")
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

    private fun createPillView(isLeft: Boolean, accentColor: Int, onTap: () -> Unit): View {
        val root = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                setColor(Color.parseColor("#CC1C1C1E"))
                if (isLeft) {
                    cornerRadii = floatArrayOf(0f, 0f, dpToPx(12).toFloat(), dpToPx(12).toFloat(), dpToPx(12).toFloat(), dpToPx(12).toFloat(), 0f, 0f)
                } else {
                    cornerRadii = floatArrayOf(dpToPx(12).toFloat(), dpToPx(12).toFloat(), 0f, 0f, 0f, 0f, dpToPx(12).toFloat(), dpToPx(12).toFloat())
                }
                setStroke(dpToPx(1), Color.parseColor("#33FFFFFF"))
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

        val lp = FrameLayout.LayoutParams(dpToPx(4), dpToPx(24)).apply {
            gravity = if (isLeft) Gravity.START or Gravity.CENTER_VERTICAL else Gravity.END or Gravity.CENTER_VERTICAL
            setMargins(if (isLeft) dpToPx(2) else 0, 0, if (!isLeft) dpToPx(2) else 0, 0)
        }

        root.addView(indicator, lp)
        return root
    }

    private fun createBottomPillView(onTap: () -> Unit): View {
        val root = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                setColor(Color.parseColor("#991C1C1E"))
                cornerRadius = dpToPx(5).toFloat()
                setStroke(dpToPx(1), Color.parseColor("#22FFFFFF"))
            }
            background = bg
            elevation = dpToPx(4).toFloat()
        }

        val bar = View(this).apply {
            val barBg = GradientDrawable().apply {
                setColor(Color.parseColor("#66FFFFFF"))
                cornerRadius = dpToPx(3).toFloat()
            }
            background = barBg
        }

        val lp = FrameLayout.LayoutParams(dpToPx(48), dpToPx(3)).apply {
            gravity = Gravity.CENTER
        }
        root.addView(bar, lp)

        root.setOnClickListener {
            onTap()
        }

        return root
    }

    private fun setupDragListener(view: View, params: WindowManager.LayoutParams, isLeft: Boolean) {
        var startY = 0f
        var initialParamY = 0
        var isClick = false

        view.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    startY = event.rawY
                    initialParamY = params.y
                    isClick = true
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaY = event.rawY - startY
                    if (abs(deltaY) > dpToPx(6)) {
                        isClick = false
                        params.y = (initialParamY + deltaY).toInt().coerceIn(dpToPx(40), resources.displayMetrics.heightPixels - dpToPx(80))
                        try {
                            windowManager?.updateViewLayout(view, params)
                        } catch (_: Exception) {}
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (isClick) {
                        v.performClick()
                        if (isLeft) {
                            openNodusPanel("device_switcher")
                        } else {
                            openNodusPanel("clipboard")
                        }
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun openNodusPanel(panelName: String) {
        try {
            val intent = Intent(this, LauncherActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("ACTION_OPEN_PANEL", panelName)
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open panel $panelName", e)
        }
    }

    fun updateVisibility(visible: Boolean) {
        val visibility = if (visible) View.VISIBLE else View.GONE
        leftHandleView?.visibility = visibility
        rightHandleView?.visibility = visibility
        bottomHandleView?.visibility = visibility
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        try {
            leftHandleView?.let { windowManager?.removeView(it) }
            rightHandleView?.let { windowManager?.removeView(it) }
            bottomHandleView?.let { windowManager?.removeView(it) }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cleanup overlay views", e)
        }
    }
}
