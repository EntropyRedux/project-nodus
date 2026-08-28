package com.nodus.home.provider

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.content.SharedPreferences
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import com.nodus.common.NodusIpcContract

/**
 * ContentProvider that exports Nodus Home launcher settings (theme, accent color, opacity)
 * to authorized Nodus companion APKs (such as Nodus Assistive Touch).
 *
 * Protected by signature permission com.nodus.permission.FLEET_ACCESS.
 */
class HomeSettingsProvider : ContentProvider() {

    companion object {
        private const val PREFS_NAME = "nodus_home_settings"
        private const val KEY_SETTINGS_JSON = "cached_settings_json"
        private const val KEY_RUNNING_APPS_JSON = "cached_running_apps_json"

        fun updateCachedSettings(context: Context, settingsJson: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_SETTINGS_JSON, settingsJson).apply()
            context.contentResolver.notifyChange(
                Uri.parse("content://${NodusIpcContract.HOME_AUTHORITY}/${NodusIpcContract.PATH_SETTINGS}"),
                null
            )
        }

        fun updateCachedRunningApps(context: Context, runningAppsJson: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_RUNNING_APPS_JSON, runningAppsJson).apply()
            context.contentResolver.notifyChange(
                Uri.parse("content://${NodusIpcContract.HOME_AUTHORITY}/${NodusIpcContract.PATH_RUNNING_APPS}"),
                null
            )
        }
    }

    override fun onCreate(): Boolean = true

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor? {
        val ctx = context ?: return null
        val path = uri.lastPathSegment ?: return null
        val prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        return when (path) {
            NodusIpcContract.PATH_SETTINGS -> {
                val json = prefs.getString(KEY_SETTINGS_JSON, "{}") ?: "{}"
                MatrixCursor(arrayOf("json")).apply {
                    addRow(arrayOf(json))
                }
            }
            NodusIpcContract.PATH_RUNNING_APPS -> {
                val json = prefs.getString(KEY_RUNNING_APPS_JSON, "[]") ?: "[]"
                MatrixCursor(arrayOf("json")).apply {
                    addRow(arrayOf(json))
                }
            }
            else -> null
        }
    }

    override fun getType(uri: Uri): String? = "application/json"

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null

    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0

    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0
}
