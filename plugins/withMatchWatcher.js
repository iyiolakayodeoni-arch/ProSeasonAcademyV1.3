// ─────────────────────────────────────────────────────────────
// withMatchWatcher — Expo config plugin.
//
// Injects the native Android MatchWatcher module into the
// prebuilt android/ project during `expo prebuild`. The module:
//
//   1. SHOWS THE OFFICIAL MediaProjection CONSENT DIALOG once per
//      session (launched from the current Activity — recording
//      never starts silently).
//   2. Starts a foreground service (type mediaProjection) that
//      runs TWO virtual displays off one projection:
//        · a 96×54 grayscale frame feed at ~1fps → "mw-frame"
//          events → frameAnalysis.ts (the pure ScoreTracker)
//          counts goals on-device; and
//        · a full-resolution MediaRecorder (H.264 MP4) that only
//          begins when the match starts ("mw-begin-recording" /
//          JS calls beginRecording()) — so the app never records
//          an entire phone session before a match is detected.
//   3. Emits time-based "mw-checkpoint" events (half / full) so
//      the Mirror Session can pause at the right moments.
//   4. On stop, resolves with the local file path (app-private
//      external files dir — never uploaded by default).
//
// No cloud, no paid AI, no third-party service. Raw video stays
// on the device. On web / iOS / missing module the app degrades
// to manual mode, which the whole session ritual supports.
// ─────────────────────────────────────────────────────────────
const { withMainApplication, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULE_DIR = 'app/src/main/java/com/onliversity/proseasonacademy';

function withMatchWatcher(config) {
  // 1. Inject the native module source files (same package as
  //    MainApplication, so no import statement is required)
  config = withMainApplication(config, (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const srcDir = path.join(projectRoot, 'android', MODULE_DIR);
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'MatchWatcherModule.kt'), MATCH_WATCHER_MODULE_KT);
    fs.writeFileSync(path.join(srcDir, 'MatchWatcherService.kt'), MATCH_WATCHER_SERVICE_KT);
    fs.writeFileSync(path.join(srcDir, 'MatchWatcherPackage.kt'), MATCH_WATCHER_PACKAGE_KT);

    // Register the package in MainApplication.kt. The modern Expo
    // template uses `PackageList(this).packages.apply { ... }`; RN
    // classic uses `val packages = PackageList(this).packages` +
    // `return packages`; the legacy template uses addPackage(...).
    // Handle all three + warn loudly instead of injecting Kotlin
    // that would not compile.
    const mainAppPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'onliversity', 'proseasonacademy', 'MainApplication.kt');
    let content = cfg.modResults.contents;
    if (!content.includes('MatchWatcherPackage')) {
      const packagesApply = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      const packagesVal = /(val\s+packages\s*=\s*PackageList\(this\)\.packages)/;
      const addPackage = /(addPackage\s*\(\s*[^)]*\))/;
      if (packagesApply.test(content)) {
        content = content.replace(packagesApply, '$1\n                add(MatchWatcherPackage())');
      } else if (packagesVal.test(content)) {
        content = content.replace(packagesVal, '$1\n          packages.add(MatchWatcherPackage())');
      } else if (addPackage.test(content)) {
        content = content.replace(addPackage, 'addPackage(MatchWatcherPackage())\n          $1');
      } else {
        console.warn(
          '[withMatchWatcher] Could not find a ReactPackage registration point in ' +
            'MainApplication.kt — MatchWatcherPackage was NOT registered. ' +
            'THE EYE will stay in manual mode.'
        );
      }
      cfg.modResults.contents = content;
    }
    return cfg;
  });

  // 2. Add MediaProjection + foreground service permissions
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return cfg;

    const perms = new Set((manifest.manifest['uses-permission'] ?? []).map((p) => p.$?.['android:name'] ?? ''));
    const needed = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
      'android.permission.POST_NOTIFICATIONS',
    ];
    for (const n of needed) {
      if (!perms.has(n)) {
        manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] ?? [];
        manifest.manifest['uses-permission'].push({ $: { 'android:name': n } });
      }
    }

    const services = app.service ?? [];
    const hasService = services.some((s) => s.$?.['android:name']?.includes('MatchWatcherService'));
    if (!hasService) {
      services.push({
        $: {
          'android:name': 'com.onliversity.proseasonacademy.MatchWatcherService',
          'android:foregroundServiceType': 'mediaProjection',
          'android:exported': 'false',
        },
      });
      app.service = services;
    }

    return cfg;
  });

  return config;
}

module.exports = withMatchWatcher;

// ── Inlined Kotlin sources (generated at prebuild time) ─────

const MATCH_WATCHER_MODULE_KT = `package com.onliversity.proseasonacademy

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

/**
 * React Native bridge for the Match Watcher (THE EYE + THE RECORDING).
 *
 * JS calls start() → Android shows the official screen-capture consent
 * dialog once → MatchWatcherService starts a foreground service with
 * MediaProjection consent. The service emits:
 *   - "mw-frame"      {w,h,b64} 96×54 grayscale, ~1fps → ScoreTracker
 *   - "mw-checkpoint" {kind: "half"|"full"} time-based match checkpoints
 *   - "mw-state"      {state, path, durationMs} recording lifecycle
 *   - "mw-error"      {message}
 *
 * beginRecording() tells the service to START the MediaRecorder — the
 * app never records an entire phone session before a match is detected.
 */
class MatchWatcherModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    com.facebook.react.bridge.ActivityEventListener {

    companion object {
        const val CONSENT_REQUEST = 4101
        const val PACKAGE = "com.onliversity.proseasonacademy"

        @Volatile
        var pendingStart: Promise? = null

        @Volatile
        var pendingStop: Promise? = null

        /** set by the module while the service is alive — the service
         *  dispatches native events through it (cross-thread safe) */
        @Volatile
        var eventBridge: ((String, WritableMap) -> Unit)? = null

        fun resolveStop(result: WritableMap) {
            pendingStop?.resolve(result)
            pendingStop = null
        }
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName() = "MatchWatcher"

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != CONSENT_REQUEST) return
        val promise = pendingStart
        pendingStart = null
        if (resultCode == Activity.RESULT_OK && data != null) {
            try {
                val intent = Intent(reactApplicationContext, MatchWatcherService::class.java).apply {
                    action = MatchWatcherService.ACTION_START
                    putExtra(MatchWatcherService.EXTRA_RESULT_CODE, resultCode)
                    putExtra(MatchWatcherService.EXTRA_RESULT_DATA, data)
                }
                eventBridge = { name, map -> emit(name, map) }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactApplicationContext.startForegroundService(intent)
                } else {
                    reactApplicationContext.startService(intent)
                }
                promise?.resolve(true)
            } catch (e: Exception) {
                promise?.reject("MW_START", e.message ?: "start failed")
            }
        } else {
            promise?.resolve(false)
        }
    }

    @ReactMethod
    fun start(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        try {
            val mpm = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            pendingStart = promise
            activity.startActivityForResult(mpm.createScreenCaptureIntent(), CONSENT_REQUEST)
        } catch (e: Exception) {
            pendingStart = null
            promise.reject("MW_START", e.message ?: "unknown error")
        }
    }

    /** tell the service to begin recording (match detected) */
    @ReactMethod
    fun beginRecording() {
        try {
            val intent = Intent(reactApplicationContext, MatchWatcherService::class.java).apply {
                action = MatchWatcherService.ACTION_BEGIN_RECORDING
            }
            reactApplicationContext.startService(intent)
        } catch (e: Exception) {
            emit("mw-error", Arguments.createMap().apply { putString("message", e.message ?: "begin recording failed") })
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        pendingStop = promise
        try {
            val intent = Intent(reactApplicationContext, MatchWatcherService::class.java).apply {
                action = MatchWatcherService.ACTION_STOP
            }
            reactApplicationContext.startService(intent)
        } catch (e: Exception) {
            pendingStop = null
            promise.resolve(Arguments.createMap())
        }
    }

    internal fun emit(name: String, map: WritableMap) {
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(name, map)
    }

    override fun onNewIntent(intent: Intent) {
        // required by ActivityEventListener — unused
    }

    @ReactMethod
    fun addListener(eventName: String?) { /* required for NativeEventEmitter */ }
    @ReactMethod
    fun removeListeners(count: Int?) { /* required for NativeEventEmitter */ }
}
`

const MATCH_WATCHER_SERVICE_KT = `package com.onliversity.proseasonacademy

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Point
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.MediaRecorder
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.util.Base64
import android.view.Display
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import java.io.File

/**
 * Foreground service (type mediaProjection) that:
 *   1. streams 96×54 grayscale frames at ~1fps → "mw-frame" events,
 *      which the pure ScoreTracker (frameAnalysis.ts) uses to count
 *      goals on-device — no cloud, no OCR, no paid AI; and
 *   2. records the match as H.264 MP4, but ONLY after the JS side
 *      calls beginRecording() (match detected / player confirms),
 *      so an entire phone session is never recorded up front.
 *
 * Raw video is written to the app-private external files dir and
 * never uploaded by default. Half-time / full-time checkpoints are
 * time-based heuristics from the recording start (~6-min halves in
 * FC Mobile) — the player can always override the checkpoint in the
 * Mirror Session UI.
 */
class MatchWatcherService : Service() {

    companion object {
        const val ACTION_START = "com.onliversity.proseasonacademy.START"
        const val ACTION_BEGIN_RECORDING = "com.onliversity.proseasonacademy.BEGIN_RECORDING"
        const val ACTION_STOP = "com.onliversity.proseasonacademy.STOP"
        const val EXTRA_RESULT_CODE = "mw_result_code"
        const val EXTRA_RESULT_DATA = "mw_result_data"
        const val NOTIFICATION_ID = 4201
        const val CHANNEL_ID = "match_watcher"
        const val OUTPUT_W = 96
        const val OUTPUT_H = 54
        /** FC Mobile halves run ~6 real minutes — heuristic checkpoints */
        const val HALF_MS = 330_000L
        const val FULL_MS = 690_000L
    }

    private val thread = HandlerThread("mw-capture")
    private lateinit var handler: Handler
    private var projection: MediaProjection? = null
    private var frameDisplay: VirtualDisplay? = null
    private var frameReader: ImageReader? = null
    private var recorder: MediaRecorder? = null
    private var recordDisplay: VirtualDisplay? = null
    private var recording = false
    private var matchStartMs = 0L
    private var halfFired = false
    private var fullFired = false
    private var currentPath: String? = null

    override fun onCreate() {
        super.onCreate()
        thread.start()
        handler = Handler(thread.looper)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            // The foreground service MUST call startForeground() from the MAIN
            // thread — doing it on the capture HandlerThread throws
            // ForegroundServiceDidNotStartInTimeException and the whole app
            // crashes. So: go foreground on main, THEN do the capture setup.
            ACTION_START -> {
                startAsForeground()          // main thread — safe
                handler.post { startCapture(intent) }
            }
            ACTION_BEGIN_RECORDING -> handler.post { startRecorder() }
            ACTION_STOP -> handler.post { stopAll() }
        }
        return START_STICKY
    }

    // ── capture ──────────────────────────────────────────────

    private fun startCapture(intent: Intent) {
        try {
            val code = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
            val data = if (Build.VERSION.SDK_INT >= 33) {
                intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(EXTRA_RESULT_DATA)
            }
            if (code != Activity.RESULT_OK || data == null) {
                stopAll()
                return
            }
            val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            projection = mpm.getMediaProjection(code, data)
            startFrames()
        } catch (e: Exception) {
            // never crash the app on a broken capture session — report + unwind
            try { emit("mw-error", Arguments.createMap().apply { putString("message", e.message ?: "capture failed") }) } catch (_: Exception) {}
            stopAll()
        }
    }

    private fun startFrames() {
        try {
            // Format 1 == ImageFormat.RGBA_8888 (stable since API 1). We pass the
            // literal instead of the named constant because some toolchains fail
            // to resolve ImageFormat.RGBA_8888 during :app:compileReleaseKotlin —
            // the literal is immune to that and behaves identically.
            val reader = ImageReader.newInstance(OUTPUT_W, OUTPUT_H, 1 /* ImageFormat.RGBA_8888 */, 2)
            frameReader = reader
            reader.setOnImageAvailableListener({ r -> onFrame(r) }, handler)
            frameDisplay = projection?.createVirtualDisplay(
                "mw-frames",
                OUTPUT_W,
                OUTPUT_H,
                resources.displayMetrics.densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface,
                null,
                handler
            )
        } catch (e: Exception) {
            try { emit("mw-error", Arguments.createMap().apply { putString("message", e.message ?: "frames failed") }) } catch (_: Exception) {}
            stopAll()
        }
    }

    private fun onFrame(reader: ImageReader) {
        val image = reader.acquireLatestImage() ?: return
        try {
            val b64 = try { grayB64(image) } catch (_: Exception) { null }
            if (b64 != null) {
                emit("mw-frame", Arguments.createMap().apply {
                    putInt("w", OUTPUT_W)
                    putInt("h", OUTPUT_H)
                    putString("b64", b64)
                })
            }
        } finally {
            try { image.close() } catch (_: Exception) {}
        }
        if (recording && matchStartMs > 0) {
            val elapsed = System.currentTimeMillis() - matchStartMs
            if (!halfFired && elapsed >= HALF_MS) {
                halfFired = true
                emit("mw-checkpoint", Arguments.createMap().apply { putString("kind", "half") })
            }
            if (!fullFired && elapsed >= FULL_MS) {
                fullFired = true
                emit("mw-checkpoint", Arguments.createMap().apply { putString("kind", "full") })
            }
        }
    }

    /** RGBA_8888 → 96×54 luminance bytes → base64 (what the ScoreTracker sees) */
    private fun grayB64(image: Image): String? {
        val plane = image.planes[0]
        val buffer = plane.buffer
        val rowStride = plane.rowStride
        val pixelStride = plane.pixelStride
        val out = ByteArray(OUTPUT_W * OUTPUT_H)
        var o = 0
        for (y in 0 until OUTPUT_H) {
            val row = y * rowStride
            for (x in 0 until OUTPUT_W) {
                val i = row + x * pixelStride
                val r = buffer.get(i).toInt() and 0xFF
                val g = buffer.get(i + 1).toInt() and 0xFF
                val b = buffer.get(i + 2).toInt() and 0xFF
                out[o++] = ((r * 299 + g * 587 + b * 114) / 1000).toByte()
            }
        }
        return Base64.encodeToString(out, Base64.NO_WRAP)
    }

    // ── recording ────────────────────────────────────────────

    private fun startRecorder() {
        if (recording || recorder != null) return
        val proj = projection ?: return
        val dir = File(getExternalFilesDir(Environment.DIRECTORY_MOVIES) ?: filesDir, "match-watcher").apply { mkdirs() }
        val file = File(dir, "session-\${System.currentTimeMillis()}.mp4")
        val dm = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val display = dm.getDisplay(Display.DEFAULT_DISPLAY)
        val size = Point().also { display.getRealSize(it) }
        val r = MediaRecorder()
        try {
            r.apply {
                setVideoSource(MediaRecorder.VideoSource.SURFACE)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setVideoEncoder(MediaRecorder.VideoEncoder.H264)
                setVideoSize(size.x, size.y)
                setVideoFrameRate(24)
                setVideoEncodingBitRate(8_000_000)
                setOutputFile(file.absolutePath)
                prepare()
            }
            val vd = proj.createVirtualDisplay(
                "mw-record",
                size.x,
                size.y,
                resources.displayMetrics.densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                r.surface,
                null,
                handler
            )
            r.start()
            recorder = r
            recordDisplay = vd
            recording = true
            matchStartMs = System.currentTimeMillis()
            halfFired = false
            fullFired = false
            currentPath = file.absolutePath
            emit("mw-state", Arguments.createMap().apply {
                putString("state", "recording")
                putString("path", file.absolutePath)
            })
        } catch (e: Exception) {
            emit("mw-error", Arguments.createMap().apply { putString("message", e.message ?: "recorder failed") })
            try { r.release() } catch (_: Exception) {}
        }
    }

    // ── teardown ─────────────────────────────────────────────

    private fun stopAll() {
        var durationMs = 0L
        try {
            recorder?.let { r ->
                try { r.stop() } catch (_: RuntimeException) { /* never started */ }
                try { r.release() } catch (_: Exception) {}
            }
            try { recordDisplay?.release() } catch (_: Exception) {}
            try { frameDisplay?.release() } catch (_: Exception) {}
            try { frameReader?.close() } catch (_: Exception) {}
            try { projection?.stop() } catch (_: Exception) {}
            if (currentPath != null) durationMs = System.currentTimeMillis() - matchStartMs
        } finally {
            recording = false
            val path = currentPath
            recorder = null
            recordDisplay = null
            frameDisplay = null
            frameReader = null
            projection = null
            val state = Arguments.createMap().apply {
                putString("state", "stopped")
                putString("path", path ?: "")
                putDouble("durationMs", durationMs.toDouble())
            }
            emit("mw-state", state)
            MatchWatcherModule.resolveStop(state)
            stopForegroundCompat()
            stopSelf()
        }
    }

    // ── foreground / helpers ─────────────────────────────────

    private fun startAsForeground() {
        createChannel()
        val notification: Notification
        val builder = android.app.Notification.Builder(this, CHANNEL_ID)
        builder
            .setContentTitle("MIRROR — armed")
            .setContentText("Waiting for your match. Recording starts when the match starts.")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
        notification = builder.build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "Match Watcher", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Screen capture + local match recording for the Mirror Session"
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        }
    }

    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE) else @Suppress("DEPRECATION") stopForeground(true)
    }

    private fun emit(name: String, map: WritableMap) {
        MatchWatcherModule.eventBridge?.invoke(name, map)
    }

    override fun onDestroy() {
        try { projection?.stop() } catch (_: Exception) {}
        projection = null
        thread.quitSafely()
        super.onDestroy()
    }
}
`

const MATCH_WATCHER_PACKAGE_KT = `package com.onliversity.proseasonacademy

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class MatchWatcherPackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(MatchWatcherModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
`