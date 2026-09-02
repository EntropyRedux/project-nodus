package com.nodus.fleet.net

import android.util.Log
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Async HTTP RPC Client for communicating with companion Fleet nodes with Bearer Authentication.
 */
class HttpRpcClient {

    companion object {
        private const val TAG = "HttpRpcClient"
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(3, TimeUnit.SECONDS)
        .readTimeout(4, TimeUnit.SECONDS)
        .writeTimeout(4, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private fun buildRequest(url: String, authToken: String? = null, postBody: String? = null): Request {
        val builder = Request.Builder().url(url)
        val token = if (authToken.isNullOrBlank()) "NODUS-FLEET-SECURE" else authToken
        builder.header("Authorization", "Bearer $token")
        builder.header("X-Nodus-Auth-Token", token)
        if (postBody != null) {
            builder.post(postBody.toRequestBody(JSON_MEDIA_TYPE))
        } else {
            builder.get()
        }
        return builder.build()
    }

    fun fetchStats(
        ip: String,
        port: Int,
        authToken: String? = null,
        onSuccess: (JSONObject) -> Unit,
        onError: (Exception) -> Unit = {}
    ) {
        val cleanIp = ip.removePrefix("http://").removePrefix("https://").substringBefore(":")
        val url = "http://$cleanIp:$port/api/status"
        val request = buildRequest(url, authToken)

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!it.isSuccessful) {
                        onError(IOException("HTTP ${it.code} on $url"))
                        return
                    }
                    val body = it.body?.string() ?: "{}"
                    try {
                        val json = JSONObject(body)
                        onSuccess(json)
                    } catch (e: Exception) {
                        onError(e)
                    }
                }
            }
        })
    }

    fun fetchProcesses(
        ip: String,
        port: Int,
        authToken: String? = null,
        onSuccess: (JSONArray) -> Unit,
        onError: (Exception) -> Unit = {}
    ) {
        val cleanIp = ip.removePrefix("http://").removePrefix("https://").substringBefore(":")
        val url = "http://$cleanIp:$port/api/processes"
        val request = buildRequest(url, authToken)

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!it.isSuccessful) {
                        onError(IOException("HTTP ${it.code} on $url"))
                        return
                    }
                    val body = it.body?.string() ?: "{}"
                    try {
                        val json = JSONObject(body)
                        val procs = json.optJSONArray("processes") ?: JSONArray()
                        onSuccess(procs)
                    } catch (e: Exception) {
                        onError(e)
                    }
                }
            }
        })
    }

    fun killProcess(
        ip: String,
        port: Int,
        pid: Int,
        authToken: String? = null,
        onSuccess: () -> Unit,
        onError: (Exception) -> Unit = {}
    ) {
        val cleanIp = ip.removePrefix("http://").removePrefix("https://").substringBefore(":")
        val url = "http://$cleanIp:$port/api/process/kill"
        val payload = JSONObject().apply {
            put("pid", pid)
        }.toString()

        val request = buildRequest(url, authToken, payload)

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        onSuccess()
                    } else {
                        onError(IOException("HTTP ${it.code} on killProcess"))
                    }
                }
            }
        })
    }

    fun executeShortcut(
        ip: String,
        port: Int,
        commandOrId: String,
        authToken: String? = null,
        onSuccess: () -> Unit,
        onError: (Exception) -> Unit = {}
    ) {
        val cleanIp = ip.removePrefix("http://").removePrefix("https://").substringBefore(":")
        val url = "http://$cleanIp:$port/api/exec"
        val payload = JSONObject().apply {
            put("id", commandOrId)
            put("command", commandOrId)
        }.toString()

        val request = buildRequest(url, authToken, payload)

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        onSuccess()
                    } else {
                        onError(IOException("HTTP ${it.code} on executeShortcut"))
                    }
                }
            }
        })
    }

    fun sendSystemControl(
        ip: String,
        port: Int,
        action: String, // "sleep" | "lock" | "restart" | "shutdown"
        authToken: String? = null,
        onSuccess: () -> Unit,
        onError: (Exception) -> Unit = {}
    ) {
        val cleanIp = ip.removePrefix("http://").removePrefix("https://").substringBefore(":")
        val url = "http://$cleanIp:$port/api/system/control"
        val payload = JSONObject().apply {
            put("action", action)
        }.toString()

        val request = buildRequest(url, authToken, payload)

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        onSuccess()
                    } else {
                        onError(IOException("HTTP ${it.code} on sendSystemControl"))
                    }
                }
            }
        })
    }

    fun syncClipboard(
        ip: String,
        port: Int,
        text: String,
        authToken: String? = null,
        onSuccess: () -> Unit = {},
        onError: (Exception) -> Unit = {}
    ) {
        val cleanIp = ip.removePrefix("http://").removePrefix("https://").substringBefore(":")
        val url = "http://$cleanIp:$port/api/clipboard"
        val payload = JSONObject().apply {
            put("text", text)
        }.toString()

        val request = buildRequest(url, authToken, payload)

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        onSuccess()
                    } else {
                        onError(IOException("HTTP ${it.code} on syncClipboard"))
                    }
                }
            }
        })
    }
}
