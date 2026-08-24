package com.nodus.launcher.service

import android.animation.ValueAnimator
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
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.FrameLayout
import android.widget.GridLayout
import com.nodus.launcher.LauncherActivity
import kotlin.math.abs

class NodusAssistiveTouchService : Service() {

    private var windowManager: WindowManager? = null
    private var floatCircleView: View? = null
    private var circleParams: WindowManager.LayoutParams? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var snapAnimator: ValueAnimator? = null

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

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density).toInt()
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
    private fun createFloatingAssistiveCircle() {
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

        val flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED

        val dm = resources.displayMetrics
        val initialX = dpToPx(12)
        val initialY = (dm.heightPixels * 0.45).toInt()
        val circleSize = dpToPx(52)

        // Strict 52dp x 52dp window parameters (Zero full-screen blocking)
        circleParams = WindowManager.LayoutParams(
            circleSize,
            circleSize,
            overlayType,
            flags,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = initialX
            y = initialY
        }

        floatCircleView = createCircleView()
        setupDragAndDoubleTap(floatCircleView!!, circleParams!!)

        try {
            windowManager?.addView(floatCircleView, circleParams)
            Log.i(TAG, "Floating Assistive Circle attached successfully at ($initialX, $initialY)")
            resetIdleTimer()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach Floating Assistive Circle", e)
        }
    }

    private fun createCircleView(): View {
        val root = FrameLayout(this).apply {
            isClickable = true
            isFocusable = false
            setBackgroundColor(Color.TRANSPARENT)
            setPadding(dpToPx(2), dpToPx(2), dpToPx(2), dpToPx(2))
        }

        val innerCircle = FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#EE16161A"))
                setStroke(dpToPx(1.5f.toInt()), Color.parseColor("#44FFFFFF"))
            }
            background = bg
            elevation = dpToPx(10).toFloat()
        }

        // Center 4-dot Nodus logo icon
        val iconGrid = GridLayout(this).apply {
            columnCount = 2
            rowCount = 2
            alignmentMode = GridLayout.ALIGN_BOUNDS
        }

        val dotColors = arrayOf(
            Color.parseColor("#007AFF"), // Blue
            Color.parseColor("#34C759"), // Green
            Color.parseColor("#FF9500"), // Orange
            Color.parseColor("#BF5AF2")  // Purple
        )

        for (c in dotColors) {
            val dot = View(this).apply {
                val dotBg = GradientDrawable().apply {
                    setColor(c)
                    cornerRadius = dpToPx(2).toFloat()
                }
                background = dotBg
            }
            val lp = GridLayout.LayoutParams().apply {
                width = dpToPx(6)
                height = dpToPx(6)
                setMargins(dpToPx(1.2f.toInt()), dpToPx(1.2f.toInt()), dpToPx(1.2f.toInt()), dpToPx(1.2f.toInt()))
            }
            iconGrid.addView(dot, lp)
        }

        val gridLp = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.CENTER
        }
        innerCircle.addView(iconGrid, gridLp)

        root.addView(innerCircle, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        return root
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupDragAndDoubleTap(view: View, params: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var touchStartX = 0f
        var touchStartY = 0f
        var isDragging = false
        var lastTapTime = 0L

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    snapAnimator?.cancel()
                    mainHandler.removeCallbacks(idleRunnable)

                    initialX = params.x
                    initialY = params.y
                    touchStartX = event.rawX
                    touchStartY = event.rawY
                    isDragging = false

                    view.animate()
                        .alpha(1.0f)
                        .scaleX(1.18f)
                        .scaleY(1.18f)
                        .setInterpolator(OvershootInterpolator(1.8f))
                        .setDuration(160)
                        .start()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val deltaX = (event.rawX - touchStartX).toInt()
                    val deltaY = (event.rawY - touchStartY).toInt()

                    if (abs(deltaX) > dpToPx(4) || abs(deltaY) > dpToPx(4)) {
                        isDragging = true
                        params.x = initialX + deltaX
                        params.y = initialY + deltaY
                        try {
                            windowManager?.updateViewLayout(view, params)
                        } catch (_: Exception) {}
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    resetIdleTimer()

                    if (isDragging) {
                        // Smooth physics-animated magnetic snap to nearest edge
                        val screenW = resources.displayMetrics.widthPixels
                        val screenH = resources.displayMetrics.heightPixels
                        val curX = params.x
                        val curY = params.y

                        val distToLeft = curX
                        val distToRight = screenW - (curX + dpToPx(52))
                        val distToBottom = screenH - (curY + dpToPx(52))

                        var targetX = curX
                        var targetY = curY.coerceIn(dpToPx(48), screenH - dpToPx(68))

                        if (distToBottom < dpToPx(70) && distToBottom < Math.min(distToLeft, distToRight)) {
                            targetY = screenH - dpToPx(68)
                        } else if (distToLeft <= distToRight) {
                            targetX = dpToPx(12)
                        } else {
                            targetX = screenW - dpToPx(64)
                        }

                        animateSnap(view, params, curX, curY, targetX, targetY)
                    } else {
                        view.animate().scaleX(1.0f).scaleY(1.0f).setDuration(150).start()

                        // Double tap detection
                        val now = System.currentTimeMillis()
                        if (now - lastTapTime < 380) {
                            lastTapTime = 0L
                            Log.i(TAG, "DOUBLE TAP confirmed on Assistive Circle -> summoning Nodus Taskbar")
                            
                            // Pulse animation feedback on double tap
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
        // Bring Nodus Launcher to front and instruct it to open the Taskbar
        try {
            val intent = Intent(this, LauncherActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("action_open_panel", "taskbar")
            }
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch LauncherActivity from Assistive Touch", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        mainHandler.removeCallbacks(idleRunnable)
        snapAnimator?.cancel()
        try {
            floatCircleView?.let { windowManager?.removeView(it) }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cleanup assistive circle view", e)
        }
    }
}
