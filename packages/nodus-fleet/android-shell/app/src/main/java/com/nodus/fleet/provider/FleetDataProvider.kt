package com.nodus.fleet.provider

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.Bundle
import android.util.Log
import com.nodus.common.NodusIpcContract
import com.nodus.fleet.service.ClipboardSyncService
import com.nodus.fleet.service.FleetDaemonService

/**
 * ContentProvider for exporting multi-device mesh state (devices, clipboard, config)
 * and receiving RPC execution calls from Nodus Home and Nodus Assistive Touch.
 *
 * Protected by signature permission com.nodus.permission.FLEET_ACCESS.
 */
class FleetDataProvider : ContentProvider() {

    companion object {
        private const val TAG = "FleetDataProvider"
    }

    override fun onCreate(): Boolean = true

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor? {
        val path = uri.lastPathSegment ?: return null

        return when (path) {
            NodusIpcContract.PATH_DEVICES -> {
                val devicesJson = FleetDaemonService.instance?.getDevicesJson() ?: "[]"
                MatrixCursor(arrayOf("json")).apply {
                    addRow(arrayOf(devicesJson))
                }
            }
            NodusIpcContract.PATH_CLIPBOARD -> {
                val clipJson = ClipboardSyncService.instance?.getClipboardJson() ?: "[]"
                MatrixCursor(arrayOf("json")).apply {
                    addRow(arrayOf(clipJson))
                }
            }
            NodusIpcContract.PATH_CONFIG -> {
                val configJson = FleetDaemonService.instance?.getConfigJson() ?: "{}"
                MatrixCursor(arrayOf("json")).apply {
                    addRow(arrayOf(configJson))
                }
            }
            else -> null
        }
    }

    override fun getType(uri: Uri): String = "application/json"

    override fun insert(uri: Uri, values: ContentValues?): Uri? {
        val path = uri.lastPathSegment ?: return null
        val ctx = context ?: return null

        if (path == NodusIpcContract.PATH_CLIPBOARD) {
            val text = values?.getAsString("text") ?: return null
            val deviceId = values.getAsString("device_id") ?: "local"
            ClipboardSyncService.instance?.addAndSync(text, deviceId, isFromLocalDevice = true)
            ctx.contentResolver.notifyChange(
                Uri.parse("content://${NodusIpcContract.FLEET_AUTHORITY}/${NodusIpcContract.PATH_CLIPBOARD}"),
                null
            )
            return uri
        }
        return null
    }

    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int {
        val path = uri.lastPathSegment ?: return 0
        if (path == NodusIpcContract.PATH_CLIPBOARD) {
            ClipboardSyncService.instance?.clearHistory()
            return 1
        }
        return 0
    }

    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0

    override fun call(method: String, arg: String?, extras: Bundle?): Bundle? {
        val result = Bundle()
        when (method) {
            "execute_shortcut" -> {
                val deviceId = extras?.getString("device_id") ?: ""
                val command = extras?.getString("command") ?: ""
                if (deviceId.isNotEmpty() && command.isNotEmpty()) {
                    FleetDaemonService.instance?.executeRemoteShortcut(deviceId, command) { success ->
                        Log.i(TAG, "Execute remote shortcut on $deviceId result: $success")
                    }
                    result.putBoolean("success", true)
                } else {
                    result.putBoolean("success", false)
                }
            }
            "kill_process" -> {
                val deviceId = extras?.getString("device_id") ?: ""
                val pid = extras?.getInt("pid", -1) ?: -1
                if (deviceId.isNotEmpty() && pid > 0) {
                    FleetDaemonService.instance?.killRemoteProcess(deviceId, pid) { success ->
                        Log.i(TAG, "Kill remote process $pid on $deviceId result: $success")
                    }
                    result.putBoolean("success", true)
                } else {
                    result.putBoolean("success", false)
                }
            }
            "system_control" -> {
                val deviceId = extras?.getString("device_id") ?: ""
                val action = extras?.getString("action") ?: ""
                if (deviceId.isNotEmpty() && action.isNotEmpty()) {
                    FleetDaemonService.instance?.sendRemoteSystemControl(deviceId, action) { success ->
                        Log.i(TAG, "System control $action on $deviceId result: $success")
                    }
                    result.putBoolean("success", true)
                } else {
                    result.putBoolean("success", false)
                }
            }
            else -> {
                result.putBoolean("success", false)
            }
        }
        return result
    }
}
