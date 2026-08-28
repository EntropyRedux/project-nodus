package com.nodus.fleet.service

import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import com.nodus.common.NodusIpcContract
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Service managing universal cross-device clipboard history and network sync.
 */
class ClipboardSyncService : Service() {

    companion object {
        private const val TAG = "ClipboardSyncService"
        private const val MAX_HISTORY = 50

        @Volatile
        var instance: ClipboardSyncService? = null
            private set
    }

    private val clipboardHistory = CopyOnWriteArrayList<JSONObject>()
    private var clipboardManager: ClipboardManager? = null
    private var clipListener: ClipboardManager.OnPrimaryClipChangedListener? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastSyncedText: String? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

        setupClipboardListener()
        Log.i(TAG, "ClipboardSyncService started")
    }

    private fun setupClipboardListener() {
        clipListener = ClipboardManager.OnPrimaryClipChangedListener {
            try {
                val clip = clipboardManager?.primaryClip
                if (clip != null && clip.itemCount > 0) {
                    val text = clip.getItemAt(0)?.text?.toString()
                    if (!text.isNullOrBlank() && text != lastSyncedText) {
                        lastSyncedText = text
                        addAndSync(text, "local", isFromLocalDevice = true)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error handling clipboard change: ${e.message}")
            }
        }
        clipboardManager?.addPrimaryClipChangedListener(clipListener)
    }

    fun addAndSync(text: String, deviceId: String, isFromLocalDevice: Boolean = false) {
        if (text.isBlank()) return

        // Prevent duplicate consecutive entries
        if (clipboardHistory.isNotEmpty() && clipboardHistory[0].optString("text") == text) {
            return
        }

        lastSyncedText = text

        val item = JSONObject().apply {
            put("id", UUID.randomUUID().toString())
            put("text", text)
            put("deviceId", deviceId)
            put("deviceName", if (deviceId == "local" || deviceId == "poco-pad") "POCO Pad" else deviceId)
            put("deviceType", if (deviceId == "local" || deviceId == "poco-pad") "tablet" else "desktop")
            put("deviceColor", if (deviceId == "local" || deviceId == "poco-pad") "#34C759" else "#007AFF")
            put("type", if (text.startsWith("http://") || text.startsWith("https://")) "link" else if (text.contains("\n") || text.length > 80) "snippet" else "text")
            put("timestamp", SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()))
        }

        clipboardHistory.add(0, item)
        while (clipboardHistory.size > MAX_HISTORY) {
            clipboardHistory.removeAt(clipboardHistory.size - 1)
        }

        // If this came from a remote peer, also write to local Android system clipboard
        if (!isFromLocalDevice) {
            mainHandler.post {
                try {
                    val clipData = ClipData.newPlainText("Nodus Fleet Sync", text)
                    clipboardManager?.setPrimaryClip(clipData)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to write incoming clipboard to system: ${e.message}")
                }
            }
        } else {
            // Broadcast to connected Fleet companion nodes
            FleetDaemonService.instance?.broadcastClipboardToPeers(text)
        }

        // Broadcast to Nodus Home and Nodus Assistive Touch
        val broadcastIntent = Intent(NodusIpcContract.ACTION_CLIPBOARD_CHANGED).apply {
            putExtra(NodusIpcContract.EXTRA_CLIPBOARD_ITEM_JSON, item.toString())
            putExtra(NodusIpcContract.EXTRA_CLIPBOARD_TEXT, text)
        }
        sendBroadcast(broadcastIntent, NodusIpcContract.PERMISSION_FLEET_ACCESS)
    }

    fun getClipboardJson(): String {
        val array = JSONArray()
        for (item in clipboardHistory) {
            array.put(item)
        }
        return array.toString()
    }

    fun clearHistory() {
        clipboardHistory.clear()
        val broadcastIntent = Intent(NodusIpcContract.ACTION_FLEET_STATE_CHANGED)
        sendBroadcast(broadcastIntent, NodusIpcContract.PERMISSION_FLEET_ACCESS)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        clipListener?.let { clipboardManager?.removePrimaryClipChangedListener(it) }
        instance = null
    }
}
