package com.nodus.fleet.overlay

import android.animation.ObjectAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import kotlin.math.max
import kotlin.math.min

/**
 * MouseOverlayManager
 *
 * Manages a floating, hardware-accelerated system cursor overlay (TYPE_APPLICATION_OVERLAY)
 * that provides smooth real-time visual mouse tracking across all Android applications.
 *
 * Zero-compute when idle: smoothly fades out after inactivity and stops drawing.
 */
object MouseOverlayManager {
    private const val TAG = "MouseOverlayManager"
    private const val HIDE_DELAY_MS = 3500L

    private val mainHandler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var cursorView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null

    private var screenWidth = 2560f
    private var screenHeight = 1600f

    // Current pointer hotspot in screen pixels
    var currentX = 1280f
        private set
    var currentY = 800f
        private set

    private var isVisible = false
    private var isAttached = false
    var isEnabled: Boolean = true
        private set

    /**
     * When autoHide is false (default), the mouse pointer remains visible on screen continuously.
     * When true, it fades out after HIDE_DELAY_MS of inactivity.
     */
    var autoHide: Boolean = false
        set(value) {
            field = value
            if (!value && isEnabled) {
                mainHandler.removeCallbacks(hideRunnable)
                mainHandler.post {
                    cursorView?.alpha = 1f
                    isVisible = true
                }
            }
        }

    private val hideRunnable = Runnable {
        if (autoHide) {
            fadeOutCursor()
        }
    }

    fun isPermissionGranted(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    fun setEnabled(enabled: Boolean, context: Context?) {
        isEnabled = enabled
        if (!enabled) {
            mainHandler.removeCallbacks(hideRunnable)
            mainHandler.post { removeOverlay() }
        } else if (context != null) {
            mainHandler.post { show(context) }
        }
    }

    fun isOverlayActive(): Boolean = isAttached && isVisible && isEnabled

    fun isCursorVisible(): Boolean = isEnabled && isAttached && isVisible && ((cursorView?.alpha ?: 0f) > 0.05f)

    fun getHotspot(): Pair<Float, Float> = Pair(currentX, currentY)

    /**
     * Explicitly shows the floating mouse pointer on screen and keeps it visible
     */
    fun show(context: Context, resetTimer: Boolean = true) {
        isEnabled = true
        mainHandler.post {
            if (!isEnabled) return@post
            ensureOverlay(context)
            val view = cursorView ?: return@post
            view.visibility = View.VISIBLE
            view.alpha = 1f
            isVisible = true
            updatePosition()
            if (autoHide && resetTimer) {
                resetHideTimer()
            } else {
                mainHandler.removeCallbacks(hideRunnable)
            }
        }
    }

    /**
     * Explicitly hides the floating mouse pointer
     */
    fun hide() {
        mainHandler.post {
            mainHandler.removeCallbacks(hideRunnable)
            val view = cursorView ?: return@post
            if (!isVisible && view.alpha <= 0.01f) return@post
            ObjectAnimator.ofFloat(view, "alpha", view.alpha, 0f).apply {
                duration = 200
                start()
            }
            isVisible = false
        }
    }

    /**
     * Toggles the mouse pointer between enabled and disabled
     */
    fun toggle(context: Context): Boolean {
        val nextEnabled = !isEnabled
        setEnabled(nextEnabled, context)
        return nextEnabled
    }

    /**
     * Initializes display bounds and positions cursor in screen center
     */
    fun init(context: Context) {
        val dm = context.resources.displayMetrics
        screenWidth = dm.widthPixels.toFloat()
        screenHeight = dm.heightPixels.toFloat()
        currentX = screenWidth / 2f
        currentY = screenHeight / 2f
    }

    /**
     * Ensures the overlay window is attached to WindowManager
     */
    @SuppressLint("RtlHardcoded")
    fun ensureOverlay(context: Context) {
        if (!isEnabled || !isPermissionGranted(context)) return

        if (windowManager == null) {
            windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        }

        val wm = windowManager ?: return
        val dm = context.resources.displayMetrics
        screenWidth = dm.widthPixels.toFloat()
        screenHeight = dm.heightPixels.toFloat()

        if (cursorView == null) {
            cursorView = CursorPointerView(context)

            val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }

            layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                        WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.LEFT
                x = currentX.toInt()
                y = currentY.toInt()
            }
        }

        if (!isAttached && cursorView != null && layoutParams != null) {
            try {
                wm.addView(cursorView, layoutParams)
                isAttached = true
                isVisible = true
                cursorView?.alpha = 1f
                cursorView?.visibility = View.VISIBLE
                Log.i(TAG, "Mouse overlay attached at ($currentX, $currentY)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to attach mouse overlay: ${e.message}", e)
            }
        } else if (isAttached && cursorView != null) {
            cursorView?.visibility = View.VISIBLE
            cursorView?.alpha = 1f
            isVisible = true
        }
    }

    /**
     * Moves the cursor by delta (dx, dy)
     */
    fun moveTo(dx: Float, dy: Float, context: Context) {
        val dm = context.resources.displayMetrics
        screenWidth = dm.widthPixels.toFloat()
        screenHeight = dm.heightPixels.toFloat()
        currentX = max(0f, min(screenWidth - 1f, currentX + dx))
        currentY = max(0f, min(screenHeight - 1f, currentY + dy))

        if (!isEnabled) return

        mainHandler.post {
            if (!isEnabled) return@post
            ensureOverlay(context)
            updatePosition()
            if (autoHide) {
                resetHideTimer()
            } else {
                mainHandler.removeCallbacks(hideRunnable)
            }
        }
    }

    /**
     * Directly positions cursor by normalized screen percentage (0..100)
     */
    fun moveToPercent(pctX: Float, pctY: Float, context: Context) {
        val dm = context.resources.displayMetrics
        screenWidth = dm.widthPixels.toFloat()
        screenHeight = dm.heightPixels.toFloat()
        currentX = max(0f, min(screenWidth - 1f, (pctX / 100f) * screenWidth))
        currentY = max(0f, min(screenHeight - 1f, (pctY / 100f) * screenHeight))

        if (!isEnabled) return

        mainHandler.post {
            if (!isEnabled) return@post
            ensureOverlay(context)
            updatePosition()
            if (autoHide) {
                resetHideTimer()
            } else {
                mainHandler.removeCallbacks(hideRunnable)
            }
        }
    }

    private fun updatePosition() {
        if (!isEnabled) return
        val view = cursorView ?: return
        val lp = layoutParams ?: return
        val wm = windowManager ?: return

        if (!isVisible || view.alpha < 1f) {
            view.alpha = 1f
            view.visibility = View.VISIBLE
            isVisible = true
        }

        lp.x = currentX.toInt()
        lp.y = currentY.toInt()

        try {
            if (isAttached) {
                wm.updateViewLayout(view, lp)
            }
        } catch (_: Exception) {}
    }

    private fun resetHideTimer() {
        mainHandler.removeCallbacks(hideRunnable)
        if (autoHide) {
            mainHandler.postDelayed(hideRunnable, HIDE_DELAY_MS)
        }
    }

    private fun fadeOutCursor() {
        val view = cursorView ?: return
        if (!isVisible) return

        ObjectAnimator.ofFloat(view, "alpha", view.alpha, 0f).apply {
            duration = 300
            start()
        }
        isVisible = false
    }

    private fun removeOverlay() {
        mainHandler.removeCallbacks(hideRunnable)
        val view = cursorView ?: return
        val wm = windowManager ?: return

        if (isAttached) {
            try {
                wm.removeView(view)
                isAttached = false
                isVisible = false
            } catch (_: Exception) {}
        }
    }

    /**
     * Crisp, hardware-rendered mouse pointer view.
     * Dimensions: 24dp x 34dp standard arrow with drop shadow.
     */
    private class CursorPointerView(context: Context) : View(context) {
        private val arrowPath = Path()
        private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.FILL
            isDither = true
        }
        private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#1C1B1F")
            style = Paint.Style.STROKE
            strokeWidth = 3f
            strokeJoin = Paint.Join.ROUND
            strokeCap = Paint.Cap.ROUND
        }
        private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#40000000")
            style = Paint.Style.FILL
        }

        init {
            val scale = context.resources.displayMetrics.density.coerceAtLeast(1.5f)
            val s = scale * 1.1f

            // Vector arrow coordinates scaled to display density
            arrowPath.reset()
            arrowPath.moveTo(0f * s, 0f * s)
            arrowPath.lineTo(0f * s, 26f * s)
            arrowPath.lineTo(6.5f * s, 20f * s)
            arrowPath.lineTo(12f * s, 32f * s)
            arrowPath.lineTo(16f * s, 30f * s)
            arrowPath.lineTo(10.5f * s, 18f * s)
            arrowPath.lineTo(19f * s, 18f * s)
            arrowPath.close()
        }

        override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
            val size = (48 * context.resources.displayMetrics.density).toInt()
            setMeasuredDimension(size, size)
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            // Draw subtle shadow offset by 2px
            canvas.save()
            canvas.translate(2f, 3f)
            canvas.drawPath(arrowPath, shadowPaint)
            canvas.restore()

            // Draw crisp white body with dark outline
            canvas.drawPath(arrowPath, fillPaint)
            canvas.drawPath(arrowPath, strokePaint)
        }
    }
}
