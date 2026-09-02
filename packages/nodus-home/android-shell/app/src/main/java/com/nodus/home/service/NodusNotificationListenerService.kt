package com.nodus.home.service

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

class NodusNotificationListenerService : NotificationListenerService() {

    companion object {
        const val TAG = "NodusNotificationService"

        @Volatile
        var instance: NodusNotificationListenerService? = null
            private set

        private val notificationCounts = ConcurrentHashMap<String, Int>()

        var onNotificationChangeListener: (() -> Unit)? = null

        fun isPermissionGranted(context: Context): Boolean {
            val packageName = context.packageName
            val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
            if (flat != null && flat.isNotEmpty()) {
                val names = flat.split(":")
                for (name in names) {
                    val cn = ComponentName.unflattenFromString(name)
                    if (cn != null && cn.packageName == packageName) {
                        return true
                    }
                }
            }
            return false
        }

        fun getNotificationBadgesJson(): String {
            val json = JSONObject()
            val service = instance
            if (service != null) {
                try {
                    val active = service.activeNotifications
                    val counts = mutableMapOf<String, Int>()
                    if (active != null) {
                        for (sbn in active) {
                            val pkg = sbn.packageName
                            if (pkg != null && !sbn.isOngoing) {
                                counts[pkg] = (counts[pkg] ?: 0) + 1
                            }
                        }
                    }
                    for ((pkg, count) in counts) {
                        json.put(pkg, count)
                    }
                    return json.toString()
                } catch (e: Exception) {
                    Log.e(TAG, "Error calculating active notifications", e)
                }
            }
            for ((pkg, count) in notificationCounts) {
                if (count > 0) {
                    json.put(pkg, count)
                }
            }
            return json.toString()
        }

        fun getActiveNotificationsJson(context: Context): String {
            val array = JSONArray()
            val service = instance ?: return array.toString()

            try {
                val active = service.activeNotifications ?: return array.toString()
                val pm = context.packageManager
                val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())

                for (sbn in active) {
                    if (sbn.isOngoing) continue

                    val extras = sbn.notification?.extras ?: continue
                    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
                    val rawText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                        ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                        ?: ""

                    if (title.isBlank() && rawText.isBlank()) continue

                    // Mask sensitive 2FA / OTP tokens for privacy protection
                    val sanitizedText = rawText.replace(
                        Regex("(?i)(\\b(?:code|otp|pin|verification)\\s*[:is]*\\s*)(\\d{4,8})"),
                        "$1******"
                    )

                    val pkg = sbn.packageName ?: ""
                    val appName = try {
                        val appInfo = pm.getApplicationInfo(pkg, 0)
                        pm.getApplicationLabel(appInfo).toString()
                    } catch (_: Exception) {
                        pkg
                    }

                    val postTime = if (sbn.postTime > 0) {
                        timeFormat.format(Date(sbn.postTime))
                    } else {
                        "Just now"
                    }

                    val notifObj = JSONObject().apply {
                        put("id", sbn.key ?: sbn.id.toString())
                        put("appId", pkg)
                        put("packageName", pkg)
                        put("appName", appName)
                        put("title", title.ifBlank { appName })
                        put("message", sanitizedText)
                        put("time", postTime)
                        put("read", false)
                        put("iconName", "Bell")
                        put("color", "#34C759")
                    }
                    array.put(notifObj)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error getting active notifications list", e)
            }

            return array.toString()
        }

        fun launchNotification(key: String): Boolean {
            val service = instance ?: return false
            try {
                val active = service.activeNotifications ?: return false
                val sbn = active.firstOrNull { it.key == key || it.id.toString() == key }
                val intent = sbn?.notification?.contentIntent
                if (intent != null) {
                    intent.send()
                    return true
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error launching notification intent for key: $key", e)
            }
            return false
        }

        fun dismissNotification(key: String): Boolean {
            val service = instance ?: return false
            try {
                service.cancelNotification(key)
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Error dismissing notification: $key", e)
            }
            return false
        }

        fun clearAllNotifications(): Boolean {
            val service = instance ?: return false
            try {
                service.cancelAllNotifications()
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Error clearing all notifications", e)
            }
            return false
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.d(TAG, "NodusNotificationListenerService connected")
        refreshActiveNotifications()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        instance = null
        Log.d(TAG, "NodusNotificationListenerService disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null || sbn.isOngoing) return
        refreshActiveNotifications()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        refreshActiveNotifications()
    }

    private fun refreshActiveNotifications() {
        try {
            val active = activeNotifications ?: return
            val counts = mutableMapOf<String, Int>()
            for (sbn in active) {
                val pkg = sbn.packageName
                if (pkg != null && !sbn.isOngoing) {
                    counts[pkg] = (counts[pkg] ?: 0) + 1
                }
            }
            notificationCounts.clear()
            notificationCounts.putAll(counts)
            onNotificationChangeListener?.invoke()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to refresh notifications", e)
        }
    }
}
