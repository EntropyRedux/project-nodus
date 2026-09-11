package com.nodus.fleet.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Path
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Nodus Fleet Accessibility Service
 * Provides zero-overhead gesture and system navigation dispatching for remote companion control.
 * 
 * ZERO COMPUTE GUARANTEE:
 * Does not monitor window events or retain accessibility trees.
 * Only executes when an explicit gesture or navigation action is requested via HTTP.
 */
class NodusAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "NodusAccessibility"
        var instance: NodusAccessibilityService? = null
            private set

        /**
         * Check if accessibility service is currently enabled in Android Settings
         */
        fun isEnabled(context: Context): Boolean {
            if (instance != null) return true
            try {
                val expectedServiceName = "${context.packageName}/${NodusAccessibilityService::class.java.canonicalName}"
                val enabledServices = Settings.Secure.getString(
                    context.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                ) ?: return false
                return enabledServices.contains(expectedServiceName) || enabledServices.contains(context.packageName)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to inspect enabled accessibility services", e)
                return false
            }
        }

        fun performBack(): Boolean {
            return instance?.performGlobalAction(GLOBAL_ACTION_BACK) ?: false
        }

        fun performHome(): Boolean {
            return instance?.performGlobalAction(GLOBAL_ACTION_HOME) ?: false
        }

        fun performRecents(): Boolean {
            return instance?.performGlobalAction(GLOBAL_ACTION_RECENTS) ?: false
        }

        fun performNotifications(): Boolean {
            return instance?.performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS) ?: false
        }

        fun performLockScreen(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                instance?.performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) ?: false
            } else {
                false
            }
        }

        fun performPowerDialog(): Boolean {
            return instance?.performGlobalAction(GLOBAL_ACTION_POWER_DIALOG) ?: false
        }

        /**
         * Dispatch a single tap at coordinates (x, y)
         */
        fun dispatchTap(x: Float, y: Float, durationMs: Long = 50): Boolean {
            val service = instance ?: return false
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false

            val path = Path().apply {
                moveTo(x, y)
            }
            val stroke = GestureDescription.StrokeDescription(path, 0, durationMs.coerceAtLeast(10))
            val gesture = GestureDescription.Builder().addStroke(stroke).build()
            return service.dispatchGesture(gesture, null, null)
        }

        /**
         * Dispatch a swipe from (startX, startY) to (endX, endY)
         */
        fun dispatchSwipe(startX: Float, startY: Float, endX: Float, endY: Float, durationMs: Long = 250): Boolean {
            val service = instance ?: return false
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false

            val path = Path().apply {
                moveTo(startX, startY)
                lineTo(endX, endY)
            }
            val stroke = GestureDescription.StrokeDescription(path, 0, durationMs.coerceAtLeast(50))
            val gesture = GestureDescription.Builder().addStroke(stroke).build()
            return service.dispatchGesture(gesture, null, null)
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "NodusAccessibilityService connected.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Zero-compute design: do not monitor or process window events
    }

    override fun onInterrupt() {
        Log.i(TAG, "NodusAccessibilityService interrupted.")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
        Log.i(TAG, "NodusAccessibilityService destroyed.")
    }
}
