package com.nodus.common

import android.content.Context
import android.content.pm.PackageManager

/**
 * Utility to detect which Nodus modules are installed on the device.
 * Used by all 3 standalone APKs for progressive enhancement.
 *
 * PREREQUISITE: The calling APK's AndroidManifest.xml must include:
 *   <queries>
 *       <package android:name="com.nodus.home" />
 *       <package android:name="com.nodus.fleet" />
 *       <package android:name="com.nodus.assistive" />
 *   </queries>
 * Without <queries>, isInstalled() silently returns false on Android 11+.
 */
object NodusModuleDetector {

    /**
     * Check if a package is installed and visible.
     */
    fun isInstalled(context: Context, packageName: String): Boolean {
        return try {
            context.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    fun isHomeInstalled(context: Context) =
        isInstalled(context, NodusIpcContract.PACKAGE_HOME)

    fun isFleetInstalled(context: Context) =
        isInstalled(context, NodusIpcContract.PACKAGE_FLEET)

    fun isAssistiveInstalled(context: Context) =
        isInstalled(context, NodusIpcContract.PACKAGE_ASSISTIVE)

    fun isMonolithInstalled(context: Context) =
        isInstalled(context, NodusIpcContract.PACKAGE_MONOLITH)

    /**
     * Conflict check: warn if monolith AND Home are both installed.
     * Two CATEGORY_HOME launchers from Nodus would confuse the user.
     */
    fun hasConflict(context: Context): Boolean {
        val homeInstalled = isHomeInstalled(context)
        val monolithInstalled = isMonolithInstalled(context)
        return homeInstalled && monolithInstalled
    }

    /**
     * Returns a summary of installed modules for logging/debugging.
     */
    fun summary(context: Context): String {
        return buildString {
            append("NodusModules { ")
            append("home=${isHomeInstalled(context)}, ")
            append("fleet=${isFleetInstalled(context)}, ")
            append("assistive=${isAssistiveInstalled(context)}, ")
            append("monolith=${isMonolithInstalled(context)}")
            append(" }")
        }
    }
}
