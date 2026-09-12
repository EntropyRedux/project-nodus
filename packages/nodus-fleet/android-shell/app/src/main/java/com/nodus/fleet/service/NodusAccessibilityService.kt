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

        fun performTakeScreenshot(): Boolean {
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                instance?.performGlobalAction(GLOBAL_ACTION_TAKE_SCREENSHOT) ?: false
            } else {
                false
            }
        }

        /**
         * Perform text editing context actions (select all, cut, copy, paste, undo)
         * on the currently focused input field.
         */
        fun performContextAction(action: String): Boolean {
            val service = instance ?: return false
            val focusedNode = service.findFocus(android.view.accessibility.AccessibilityNodeInfo.FOCUS_INPUT)
                ?: service.rootInActiveWindow?.findFocus(android.view.accessibility.AccessibilityNodeInfo.FOCUS_INPUT)

            val cleanAction = action.trim().lowercase()
            return when (cleanAction) {
                "select_all", "selectall" -> {
                    if (focusedNode != null) {
                        // 1. Check custom or system action labeled select all
                        val customAction = focusedNode.actionList?.firstOrNull {
                            it.label?.toString()?.contains("select all", ignoreCase = true) == true
                        }
                        if (customAction != null && focusedNode.performAction(customAction.id)) {
                            return true
                        }
                        // 2. Select entire text span via standard ACTION_SET_SELECTION
                        val len = focusedNode.text?.length ?: 0
                        val args = android.os.Bundle().apply {
                            putInt(android.view.accessibility.AccessibilityNodeInfo.ACTION_ARGUMENT_SELECTION_START_INT, 0)
                            putInt(android.view.accessibility.AccessibilityNodeInfo.ACTION_ARGUMENT_SELECTION_END_INT, len)
                        }
                        focusedNode.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_SET_SELECTION, args)
                    } else {
                        false
                    }
                }
                "cut" -> {
                    focusedNode?.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CUT) ?: false
                }
                "copy" -> {
                    focusedNode?.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_COPY) ?: false
                }
                "paste" -> {
                    focusedNode?.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_PASTE) ?: false
                }
                "undo" -> {
                    if (focusedNode != null) {
                        val undoAction = focusedNode.actionList?.firstOrNull {
                            it.label?.toString()?.contains("undo", ignoreCase = true) == true
                        }
                        if (undoAction != null && focusedNode.performAction(undoAction.id)) {
                            return true
                        }
                    }
                    // Try shell key combination for Ctrl+Z (KEYCODE_CTRL_LEFT 113, KEYCODE_Z 54)
                    try {
                        val pb = ProcessBuilder("/system/bin/sh", "-c", "input keycombination 113 54")
                        val p = pb.start()
                        p.waitFor(1, java.util.concurrent.TimeUnit.SECONDS)
                        p.exitValue() == 0
                    } catch (_: Exception) {
                        false
                    }
                }
                else -> false
            }
        }

        /**
         * Inject text into the currently focused input field via Accessibility
         */
        fun performInjectText(text: String): Boolean {
            val service = instance ?: return false
            val focusedNode = service.findFocus(android.view.accessibility.AccessibilityNodeInfo.FOCUS_INPUT)
                ?: service.rootInActiveWindow?.findFocus(android.view.accessibility.AccessibilityNodeInfo.FOCUS_INPUT)

            if (focusedNode != null) {
                val args = android.os.Bundle().apply {
                    putCharSequence(android.view.accessibility.AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
                }
                if (focusedNode.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_SET_TEXT, args)) {
                    return true
                }
            }
            return false
        }

        /**
         * Toggle Android soft keyboard visibility
         */
        fun toggleSoftKeyboard(context: Context): Boolean {
            val service = instance
            if (service != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    val controller = service.softKeyboardController
                    val current = controller.showMode
                    controller.showMode = if (current == SHOW_MODE_HIDDEN) {
                        SHOW_MODE_AUTO
                    } else {
                        SHOW_MODE_HIDDEN
                    }
                    return true
                } catch (_: Exception) {}
            }
            val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? android.view.inputmethod.InputMethodManager
            imm?.toggleSoftInput(android.view.inputmethod.InputMethodManager.SHOW_FORCED, 0)
            return true
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
