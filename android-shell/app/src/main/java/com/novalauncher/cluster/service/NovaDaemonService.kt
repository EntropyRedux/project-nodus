package com.novalauncher.cluster.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class NovaDaemonService : Service() {

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(5000, TimeUnit.MILLISECONDS)
        .build()

    private var webSocket: WebSocket? = null

    companion object {
        const val CHANNEL_ID = "nova_daemon_channel"
        const val NOTIF_ID = 8891
        const val TAG = "NovaDaemonService"
        var activeInstance: NovaDaemonService? = null
    }

    override fun onCreate() {
        super.onCreate()
        activeInstance = this
        createNotificationChannel()
        startForeground(NOTIF_ID, buildForegroundNotification("Connected to Nova Mesh Tailnet"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val hubHost = intent?.getStringExtra("hubHost") ?: "nova-desktop"
        val hubPort = intent?.getIntExtra("hubPort", 8890) ?: 8890
        connectToHub(hubHost, hubPort)
        return START_STICKY
    }

    private fun connectToHub(host: string, port: Int) {
        val request = Request.Builder()
            .url("wss://$host:$port/ws")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.i(TAG, "Successfully connected to Cluster Hub on $host:$port")
            }

            override fun onMessage(ws: WebSocket, text: String) {
                handleRpcMessage(text)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "Cluster connection error: ${t.message}. Retrying...")
            }
        })
    }

    private fun handleRpcMessage(raw: String) {
        try {
            val json = JSONObject(raw)
            val action = json.optString("action")
            val id = json.optString("id")

            when (action) {
                "LAUNCH_INTENT" -> {
                    val pkg = json.optJSONObject("params")?.optString("packageName") ?: ""
                    val intent = packageManager.getLaunchIntentForPackage(pkg)?.apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    if (intent != null) {
                        startActivity(intent)
                    }
                }
                "SET_CLIPBOARD" -> {
                    val text = json.optJSONObject("params")?.optString("text") ?: ""
                    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("NovaClusterSync", text))
                }
                "LOCK_DEVICE" -> {
                    NovaAccessibilityService.instance?.performGlobalLock()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling incoming cluster RPC message", e)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Nova Mesh Background Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(status: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Nova Multi-Device Controller")
            .setContentText(status)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true)
            .build()
    }
}
