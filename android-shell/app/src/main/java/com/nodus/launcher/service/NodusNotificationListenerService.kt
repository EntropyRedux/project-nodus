package com.nodus.launcher.service

import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONObject
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
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        if (sbn.isOngoing) return
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
