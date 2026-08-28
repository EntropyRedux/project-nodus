package com.nodus.assistive

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.nodus.assistive.service.AssistiveTouchService

class PermissionActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Settings.canDrawOverlays(this)) {
            startOverlayService()
            finish()
            return
        }

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(0xFF0F172A.toInt())
            setPadding(48, 48, 48, 48)
        }

        val title = TextView(this).apply {
            text = "Nodus Assistive Touch"
            textSize = 22f
            setTextColor(0xFFFFFFFF.toInt())
            gravity = Gravity.CENTER
        }

        val desc = TextView(this).apply {
            text = "To display the floating dock and multitasking overlay over any app, Nodus requires the 'Display over other apps' permission."
            textSize = 14f
            setTextColor(0xFF94A3B8.toInt())
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 36)
        }

        val grantButton = Button(this).apply {
            text = "Grant Overlay Permission"
            setBackgroundColor(0xFF2563EB.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setOnClickListener {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
            }
        }

        layout.addView(title)
        layout.addView(desc)
        layout.addView(grantButton)

        setContentView(layout)
    }

    override fun onResume() {
        super.onResume()
        if (Settings.canDrawOverlays(this)) {
            startOverlayService()
            Toast.makeText(this, "Nodus Assistive Touch is active", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    private fun startOverlayService() {
        val intent = Intent(this, AssistiveTouchService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(this, intent)
        } else {
            startService(intent)
        }
    }
}
