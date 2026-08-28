package com.nodus.home.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.nodus.common.NodusIpcContract
import com.nodus.home.HomeActivity

class FleetStateReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "FleetStateReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "Received broadcast action: $action")

        val activity = HomeActivity.instance ?: return

        activity.runOnUiThread {
            when (action) {
                NodusIpcContract.ACTION_FLEET_STATE_CHANGED -> {
                    activity.webView?.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('fleet-state-changed'))",
                        null
                    )
                }
                NodusIpcContract.ACTION_DEVICE_CONNECTED -> {
                    val json = intent.getStringExtra(NodusIpcContract.EXTRA_DEVICE_JSON) ?: "{}"
                    activity.webView?.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('fleet-device-connected', { detail: $json }))",
                        null
                    )
                }
                NodusIpcContract.ACTION_DEVICE_DISCONNECTED -> {
                    val json = intent.getStringExtra(NodusIpcContract.EXTRA_DEVICE_JSON) ?: "{}"
                    activity.webView?.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('fleet-device-disconnected', { detail: $json }))",
                        null
                    )
                }
                NodusIpcContract.ACTION_CLIPBOARD_CHANGED -> {
                    val json = intent.getStringExtra(NodusIpcContract.EXTRA_CLIPBOARD_ITEM_JSON) ?: "{}"
                    activity.webView?.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('fleet-clipboard-changed', { detail: $json }))",
                        null
                    )
                }
                NodusIpcContract.ACTION_TOGGLE_TASKBAR -> {
                    activity.webView?.evaluateJavascript(
                        "(function(){ if (window.dispatchEvent) { window.dispatchEvent(new CustomEvent('nodus_open_panel', { detail: { panel: 'taskbar' } })); } })()",
                        null
                    )
                }
            }
        }
    }
}
