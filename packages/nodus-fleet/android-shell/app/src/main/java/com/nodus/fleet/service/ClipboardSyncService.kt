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
        private const val MAX_HISTORY = 100

        @Volatile
        var instance: ClipboardSyncService? = null
            private set
    }

    private val clipboardHistory = CopyOnWriteArrayList<JSONObject>()
    private var clipboardManager: ClipboardManager? = null
    private var clipListener: ClipboardManager.OnPrimaryClipChangedListener? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastSyncedSignature: String? = null
    @Volatile
    private var isSyncEnabled: Boolean = true

    override fun onCreate() {
        super.onCreate()
        instance = this
        clipboardManager = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

        val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
        isSyncEnabled = prefs.getBoolean("clipboard_sync_enabled", true)

        loadHistoryFromPrefs()
        setupClipboardListener()
        Log.i(TAG, "ClipboardSyncService started with isSyncEnabled=$isSyncEnabled, historyItems=${clipboardHistory.size}")
    }

    fun setSyncEnabled(enabled: Boolean) {
        isSyncEnabled = enabled
        Log.i(TAG, "ClipboardSyncService syncEnabled set to: $enabled")
    }

    fun isSyncEnabled(): Boolean = isSyncEnabled

    private fun setupClipboardListener() {
        clipListener = ClipboardManager.OnPrimaryClipChangedListener {
            if (!isSyncEnabled) return@OnPrimaryClipChangedListener
            try {
                val clip = clipboardManager?.primaryClip
                if (clip != null && clip.itemCount > 0) {
                    val item = clip.getItemAt(0)
                    val uri = item?.uri
                    val text = item?.text?.toString() ?: item?.coerceToText(this)?.toString()

                    if (uri != null) {
                        try {
                            val inputStream = contentResolver.openInputStream(uri)
                            val bytes = inputStream?.use { it.readBytes() }
                            if (bytes != null && bytes.isNotEmpty()) {
                                val mimeType = contentResolver.getType(uri) ?: "image/png"
                                val b64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                                val rawImgData = "data:$mimeType;base64,$b64"
                                val optimizedImg = resizeBase64Image(rawImgData, 800)
                                val sig = "img_${optimizedImg.length}_${optimizedImg.take(30)}_${optimizedImg.takeLast(30)}"
                                if (sig != lastSyncedSignature) {
                                    addAndSync(text ?: "Image", "local", imageData = optimizedImg, isFromLocalDevice = true)
                                }
                                return@OnPrimaryClipChangedListener
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Failed to read uri stream: ${e.message}")
                        }
                    }

                    if (!text.isNullOrBlank()) {
                        val sig = "txt_${text.trim()}"
                        if (sig != lastSyncedSignature) {
                            addAndSync(text, "local", imageData = null, isFromLocalDevice = true)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error handling clipboard change: ${e.message}")
            }
        }
        clipboardManager?.addPrimaryClipChangedListener(clipListener)
    }

    fun addAndSync(
        text: String,
        deviceId: String,
        imageData: String? = null,
        isFromLocalDevice: Boolean = false,
        customName: String? = null
    ) {
        if (!isSyncEnabled && isFromLocalDevice) {
            Log.d(TAG, "Clipboard sync disabled, skipping outgoing sync")
            return
        }

        val cleanText = text.trim()
        val rawImage = if (imageData.isNullOrBlank() || imageData.trim() == "null" || imageData.trim() == "undefined") null else imageData.trim()
        val cleanImage = if (rawImage != null) resizeBase64Image(rawImage, 800) else null

        if (cleanText.isBlank() && cleanImage.isNullOrBlank()) return

        // Compute signature to prevent duplicate consecutive entries & echo loops
        val signature = if (!cleanImage.isNullOrBlank()) {
            "img_${cleanImage.length}_${cleanImage.take(30)}_${cleanImage.takeLast(30)}"
        } else {
            "txt_$cleanText"
        }

        if (signature == lastSyncedSignature && !isFromLocalDevice) {
            return
        }
        lastSyncedSignature = signature

        val isUrl = cleanText.startsWith("http://") || cleanText.startsWith("https://")
        val isCode = cleanText.contains("\n") || cleanText.contains("{") || cleanText.contains("const ") || cleanText.contains("function ")

        val isLocal = deviceId == "local" || deviceId == "poco-pad"
        val devName = customName ?: if (isLocal) "POCO Pad" else if (deviceId.contains("desktop") || deviceId.contains("win") || deviceId.contains("this-pc")) "Host PC" else deviceId
        val devType = if (isLocal) "tablet" else "desktop"
        val devColor = if (isLocal) "#6DD58C" else "#A8C7FA"
        val itemType = if (!cleanImage.isNullOrBlank()) "image" else if (isUrl) "link" else if (isCode) "code" else "text"

        val item = JSONObject().apply {
            put("id", "clip-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(6)}")
            put("text", if (cleanText.isNotBlank()) cleanText else "Image (${cleanImage?.length ?: 0} B)")
            if (!cleanImage.isNullOrBlank()) {
                put("imageData", cleanImage)
            }
            put("deviceId", deviceId)
            put("deviceName", devName)
            put("deviceType", devType)
            put("deviceColor", devColor)
            put("type", itemType)
            put("pinned", false)
            put("timestamp", SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()))
        }

        // Deduplicate existing history item with same text/image
        val iterator = clipboardHistory.iterator()
        while (iterator.hasNext()) {
            val existing = iterator.next()
            if (!cleanImage.isNullOrBlank()) {
                if (existing.optString("imageData") == cleanImage) {
                    clipboardHistory.remove(existing)
                }
            } else if (existing.optString("text") == cleanText && existing.optString("type") != "image") {
                clipboardHistory.remove(existing)
            }
        }

        clipboardHistory.add(0, item)
        while (clipboardHistory.size > MAX_HISTORY) {
            clipboardHistory.removeAt(clipboardHistory.size - 1)
        }
        saveHistoryToPrefs()

        // Ensure Android system clipboard matches content ONLY IF from remote peer
        // (If from local device, it's ALREADY the system clipboard; setting it again triggers infinite loops)
        if (!isFromLocalDevice) {
            if (!cleanImage.isNullOrBlank()) {
                mainHandler.post {
                    try {
                        val imagesDir = java.io.File(cacheDir, "clipboard_images")
                        imagesDir.mkdirs()
                        val imageFile = java.io.File(imagesDir, "clip_current.png")
                        val rawBase64 = if (cleanImage.contains("base64,")) {
                            cleanImage.substringAfter("base64,")
                        } else {
                            cleanImage
                        }
                        val bytes = android.util.Base64.decode(rawBase64, android.util.Base64.DEFAULT)
                        imageFile.writeBytes(bytes)

                        val uri = androidx.core.content.FileProvider.getUriForFile(
                            this@ClipboardSyncService,
                            "${packageName}.fileprovider",
                            imageFile
                        )

                        val clipData = ClipData.newUri(contentResolver, "Nodus Fleet Image", uri)
                        clipboardManager?.setPrimaryClip(clipData)
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to write image to system clipboard: ${e.message}")
                    }
                }
            } else if (cleanText.isNotBlank()) {
                mainHandler.post {
                    try {
                        val currentText = clipboardManager?.primaryClip?.getItemAt(0)?.text?.toString()
                        if (currentText != cleanText) {
                            val clipData = ClipData.newPlainText("Nodus Fleet Sync", cleanText)
                            clipboardManager?.setPrimaryClip(clipData)
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to write clipboard to system: ${e.message}")
                    }
                }
            }
        }

        if (isFromLocalDevice) {
            // Broadcast to connected Fleet companion nodes
            FleetDaemonService.instance?.broadcastClipboardToPeers(cleanText, cleanImage)
        }

        // Notify Android IPC (Nodus Home, Nodus Assistive) with TransactionTooLarge-safe payload
        try {
            val broadcastItem = JSONObject(item.toString()).apply {
                if (has("imageData") && optString("imageData").length > 30000) {
                    put("imageData", "")
                    put("hasImage", true)
                }
            }
            val broadcastIntent = Intent(NodusIpcContract.ACTION_CLIPBOARD_CHANGED).apply {
                putExtra(NodusIpcContract.EXTRA_CLIPBOARD_ITEM_JSON, broadcastItem.toString())
                putExtra(NodusIpcContract.EXTRA_CLIPBOARD_TEXT, cleanText)
            }
            sendBroadcast(broadcastIntent, NodusIpcContract.PERMISSION_FLEET_ACCESS)
        } catch (e: Exception) {
            Log.w(TAG, "Error broadcasting clipboard change intent: ${e.message}")
        }

        // Notify in-app WebView React frontend with zero latency
        FleetDaemonService.instance?.notifyStateChanged()
        mainHandler.post {
            val jsonStr = item.toString()
            com.nodus.fleet.FleetActivity.instance?.evaluateJs(
                "window.dispatchEvent(new CustomEvent('clipboard-changed', { detail: $jsonStr }));"
            )
        }
    }

    fun getClipboardJson(): String {
        val array = JSONArray()
        for (item in clipboardHistory) {
            array.put(item)
        }
        return array.toString()
    }

    fun deleteItem(id: String) {
        val found = clipboardHistory.find { it.optString("id") == id }
        if (found != null) {
            clipboardHistory.remove(found)
            saveHistoryToPrefs()
            FleetDaemonService.instance?.notifyStateChanged()
        }
    }

    fun togglePin(id: String) {
        val found = clipboardHistory.find { it.optString("id") == id }
        if (found != null) {
            val current = found.optBoolean("pinned", false)
            found.put("pinned", !current)
            saveHistoryToPrefs()
            FleetDaemonService.instance?.notifyStateChanged()
        }
    }

    fun clearHistory() {
        clipboardHistory.clear()
        saveHistoryToPrefs()
        FleetDaemonService.instance?.notifyStateChanged()
        val broadcastIntent = Intent(NodusIpcContract.ACTION_FLEET_STATE_CHANGED)
        sendBroadcast(broadcastIntent, NodusIpcContract.PERMISSION_FLEET_ACCESS)
    }

    private fun saveHistoryToPrefs() {
        try {
            val array = JSONArray()
            val snapshot = clipboardHistory.take(50)
            for (item in snapshot) {
                array.put(item)
            }
            val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
            prefs.edit().putString("persisted_clipboard_history", array.toString()).apply()
        } catch (e: Exception) {
            Log.w(TAG, "Error saving clipboard history: ${e.message}")
        }
    }

    private fun loadHistoryFromPrefs() {
        try {
            val prefs = getSharedPreferences("nodus_fleet_prefs", Context.MODE_PRIVATE)
            val raw = prefs.getString("persisted_clipboard_history", null)
            if (!raw.isNullOrBlank()) {
                val array = JSONArray(raw)
                clipboardHistory.clear()
                for (i in 0 until array.length()) {
                    val obj = array.optJSONObject(i)
                    if (obj != null) {
                        val img = obj.optString("imageData")
                        if (img == "null" || img == "undefined") {
                            obj.remove("imageData")
                            obj.put("type", "text")
                        }
                        clipboardHistory.add(obj)
                    }
                }
                Log.i(TAG, "Loaded ${clipboardHistory.size} items from persistent storage")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error loading clipboard history: ${e.message}")
        }
    }

    private fun resizeBase64Image(rawBase64: String, maxDim: Int = 800): String {
        return try {
            val pureB64 = if (rawBase64.contains("base64,")) rawBase64.substringAfter("base64,") else rawBase64
            val bytes = android.util.Base64.decode(pureB64, android.util.Base64.DEFAULT)
            val opts = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
            android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
            val w = opts.outWidth
            val h = opts.outHeight
            if (w <= 0 || h <= 0) return rawBase64

            var sampleSize = 1
            while (w / sampleSize > maxDim * 2 || h / sampleSize > maxDim * 2) {
                sampleSize *= 2
            }
            val decodeOpts = android.graphics.BitmapFactory.Options().apply {
                inSampleSize = sampleSize
            }
            val bmp = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOpts) ?: return rawBase64
            val scale = minOf(maxDim.toFloat() / bmp.width, maxDim.toFloat() / bmp.height, 1.0f)
            val scaled = if (scale < 1.0f) {
                android.graphics.Bitmap.createScaledBitmap(bmp, (bmp.width * scale).toInt(), (bmp.height * scale).toInt(), true)
            } else {
                bmp
            }
            val stream = java.io.ByteArrayOutputStream()
            scaled.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, stream)
            val outBytes = stream.toByteArray()
            val outB64 = android.util.Base64.encodeToString(outBytes, android.util.Base64.NO_WRAP)
            "data:image/jpeg;base64,$outB64"
        } catch (_: Exception) {
            rawBase64
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        clipListener?.let { clipboardManager?.removePrimaryClipChangedListener(it) }
        instance = null
    }
}
