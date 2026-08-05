// ─────────────────────────────────────────────────────────────
// withInstaller — Expo config plugin for the Onliversity PM.
//
// At `expo prebuild` it injects, into the generated android/ project:
//   1. the REQUEST_INSTALL_PACKAGES permission,
//   2. a FileProvider authority (<pkg>.fileprovider) so a downloaded
//      APK can be handed to the system installer as a content:// URI
//      (file:// has been illegal since Android 7),
//   3. the res/xml file_paths resource covering the downloads dir,
//   4. a native InstallerModule (contentUriForApk, sha256OfFile,
//      canRequestInstalls, openInstallPermissionSettings,
//      installedVersionCodeOf) + its ReactPackage registration.
//
// This needs a development build (npx expo run:android / EAS) — Expo
// Go has no REQUEST_INSTALL_PACKAGES permission or FileProvider.
// ─────────────────────────────────────────────────────────────
const { withMainApplication, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PKG = 'com.onliversity.packagemanager';
const MODULE_DIR = 'app/src/main/java/com/onliversity/packagemanager';

function withInstaller(config) {
  // 1. inject the native module + register it in MainApplication.kt
  config = withMainApplication(config, (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const srcDir = path.join(projectRoot, 'android', MODULE_DIR);
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'InstallerModule.kt'), INSTALLER_MODULE_KT);
    fs.writeFileSync(path.join(srcDir, 'InstallerPackage.kt'), INSTALLER_PACKAGE_KT);

    let content = cfg.modResults.contents;
    if (!content.includes('InstallerPackage')) {
      const packagesApply = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      const packagesVal = /(val\s+packages\s*=\s*PackageList\(this\)\.packages)/;
      const addPackage = /(addPackage\s*\([^)]*\))/;
      if (packagesApply.test(content)) {
        content = content.replace(packagesApply, '$1\n                add(InstallerPackage())');
      } else if (packagesVal.test(content)) {
        content = content.replace(packagesVal, '$1\n          packages.add(InstallerPackage())');
      } else if (addPackage.test(content)) {
        content = content.replace(addPackage, 'addPackage(InstallerPackage())\n          $1');
      } else {
        console.warn(
          '[withInstaller] No ReactPackage registration point found in MainApplication.kt — ' +
            'InstallerPackage was NOT registered. The install button will not work.'
        );
      }
      cfg.modResults.contents = content;
    }
    return cfg;
  });

  // 2. permission + FileProvider in the manifest
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const perms = new Set((manifest.manifest['uses-permission'] ?? []).map((p) => p.$?.['android:name'] ?? ''));
    for (const n of ['android.permission.REQUEST_INSTALL_PACKAGES', 'android.permission.INTERNET']) {
      if (!perms.has(n)) {
        manifest.manifest['uses-permission'] = manifest.manifest['uses-permission'] ?? [];
        manifest.manifest['uses-permission'].push({ $: { 'android:name': n } });
      }
    }
    const app = manifest.manifest.application?.[0];
    if (app) {
      const providers = app.provider ?? [];
      const has = providers.some((p) => (p.$?.['android:authorities'] ?? '').endsWith('.fileprovider'));
      if (!has) {
        providers.push({
          $: {
            'android:name': 'androidx.core.content.FileProvider',
            'android:authorities': '${applicationId}.fileprovider',
            'android:exported': 'false',
            'android:grantUriPermissions': 'true',
          },
          'meta-data': [
            {
              $: {
                'android:name': 'android.support.FILE_PROVIDER_PATHS',
                'android:resource': '@xml/onliversity_file_paths',
              },
            },
          ],
        });
        app.provider = providers;
      }
    }
    return cfg;
  });

  // 3. the file_paths resource (covers FileSystem.documentDirectory + 'downloads/')
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const resXml = path.join(cfg.modRequest.projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(resXml, { recursive: true });
      fs.writeFileSync(
        path.join(resXml, 'onliversity_file_paths.xml'),
        '<?xml version="1.0" encoding="utf-8"?>\n<paths>\n  <cache-path name="cache" path="."/>\n  <files-path name="files" path="."/>\n</paths>\n'
      );
      return cfg;
    },
  ]);

  return config;
}

module.exports = withInstaller;

const INSTALLER_MODULE_KT = `package ${PKG}

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.security.MessageDigest

/**
 * Native bridge for installing Onliversity APKs the honest way:
 * the PM downloads an APK, verifies its SHA-256 against the manifest,
 * gets a content:// URI from its FileProvider, and hands it to the
 * system installer — which ALWAYS shows the "Install unknown app"
 * prompt. Silent install is impossible on standard Android; that is
 * the OS, not us.
 *
 * Android 13+ blocks sideloaded apps from the install-unknown-apps
 * permission by default ("Restricted Settings"). openInstallPermissionSettings
 * sends the user to the per-app toggle; the JS UI walks them through
 * the extra "Allow restricted settings" step the first time.
 */
class InstallerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "OnliversityInstaller"

    private fun downloadsDir(): File =
        reactApplicationContext.cacheDir

    /** does this PM have the right to install unknown apps? */
    @ReactMethod
    fun canRequestInstalls(promise: Promise) {
        try {
            promise.resolve(reactApplicationContext.packageManager.canRequestPackageInstalls())
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /** open the system "install unknown apps" toggle for THIS app */
    @ReactMethod
    fun openInstallPermissionSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                data = Uri.parse("package:" + reactApplicationContext.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.currentActivity?.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            // fallback: the app-details screen (also reaches Restricted Settings)
            try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.parse("package:" + reactApplicationContext.packageName))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.currentActivity?.startActivity(intent)
                promise.resolve(true)
            } catch (e2: Exception) {
                promise.resolve(false)
            }
        }
    }

    /** SHA-256 of a downloaded APK, hex — verified against the manifest */
    @ReactMethod
    fun sha256OfFile(filename: String, promise: Promise) {
        try {
            val file = File(downloadsDir(), filename)
            val md = MessageDigest.getInstance("SHA-256")
            file.inputStream().use { input ->
                val buf = ByteArray(8 * 1024)
                while (true) {
                    val n = input.read(buf)
                    if (n == -1) break
                    md.update(buf, 0, n)
                }
            }
            promise.resolve(md.digest().joinToString("") { "%02x".format(it) })
        } catch (e: Exception) {
            promise.reject("HASH_FAIL", e.message ?: "sha256 failed")
        }
    }

    /** a content:// URI for a downloaded APK, granted to the system installer */
    @ReactMethod
    fun contentUriForApk(filename: String, promise: Promise) {
        try {
            val file = File(downloadsDir(), filename)
            val authority = reactApplicationContext.packageName + ".fileprovider"
            promise.resolve(FileProvider.getUriForFile(reactApplicationContext, authority, file).toString())
        } catch (e: Exception) {
            promise.reject("URI_FAIL", e.message ?: "could not build content uri")
        }
    }

    /** installed versionCode of another Onliversity app by package, or -1 if absent */
    @ReactMethod
    fun installedVersionCodeOf(packageName: String, promise: Promise) {
        try {
            val info = reactApplicationContext.packageManager
                .getPackageInfo(packageName, 0)
            promise.resolve(android.os.Build.VERSION.SDK_INT >= 28
                ? info.longVersionCode.toInt()
                : @Suppress("DEPRECATION") info.versionCode)
        } catch (e: Exception) {
            promise.resolve(-1) // not installed
        }
    }

    @ReactMethod fun addListener(eventName: String?) {}
    @ReactMethod fun removeListeners(count: Int?) {}
}
`;

const INSTALLER_PACKAGE_KT = `package ${PKG}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class InstallerPackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(InstallerModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
`;
