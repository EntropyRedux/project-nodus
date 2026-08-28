package com.nodus.assistive.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.nodus.assistive.service.AssistiveTouchService
import com.nodus.common.NodusIpcContract

class FleetStateReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "AssistiveFleetReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "Assistive receiver got action: $action")

        val webView = AssistiveTouchService.instance?.overlayWebView ?: return

        Handler(Looper.getMainLooper()).post {
            when (action) {
                "com.nodus.assistive.SHOW_OVERLAY" -> {
                    AssistiveTouchService.instance?.showOverlay()
                }
                "com.nodus.assistive.HIDE_OVERLAY" -> {
                    AssistiveTouchService.instance?.hideOverlay()
                }
                "com.nodus.assistive.TOGGLE_OVERLAY" -> {
                    AssistiveTouchService.instance?.toggleOverlay()
                }
                NodusIpcContract.ACTION_FLEET_STATE_CHANGED -> {
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('fleet-state-changed'))",
                        null
                    )
                }
                NodusIpcContract.ACTION_CLIPBOARD_CHANGED -> {
                    val json = intent.getStringExtra(NodusIpcContract.EXTRA_CLIPBOARD_ITEM_JSON) ?: "{}"
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('fleet-clipboard-changed', { detail: $json }))",
                        null
                    )
                }
                NodusIpcContract.ACTION_HOME_SETTINGS_CHANGED -> {
                    val json = intent.getStringExtra(NodusIpcContract.EXTRA_SETTINGS_JSON) ?: "{}"
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('home-settings-changed', { detail: $json }))",
                        null
                    )
                }
            }
        }
    }
}
