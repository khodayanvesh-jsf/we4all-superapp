package com.we4all.superapp;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Enumeration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

@CapacitorPlugin(name = "We4AllOta")
public class We4AllOtaPlugin extends Plugin {
    private static final String PREFS_OTA = "We4AllOtaPrefs";
    private static final String PREFS_CAP = "CapWebViewSettings";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        try {
            SharedPreferences otaPrefs = getContext().getSharedPreferences(PREFS_OTA, Context.MODE_PRIVATE);
            String activePath = otaPrefs.getString("active_path", "");
            String savedApkVer = otaPrefs.getString("apk_version", "");
            String currentApkVer = getApkVersionName();
            if (!activePath.isEmpty() && savedApkVer.equals(currentApkVer)) {
                File idx = new File(activePath, "index.html");
                if (idx.exists() && getBridge() != null) {
                    String currentBase = getBridge().getServerBasePath();
                    if (!activePath.equals(currentBase) && getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            getBridge().getWebView().clearCache(true);
                            getBridge().setServerBasePath(activePath);
                        });
                    }
                }
            }
        } catch (Exception ignored) {}
    }

    private void emitProgress(int pct, String msg) {
        JSObject data = new JSObject();
        data.put("pct", pct);
        data.put("msg", msg);
        notifyListeners("otaProgress", data);
    }

    private String getApkVersionName() {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            return info.versionName != null ? info.versionName : "";
        } catch (Exception e) {
            return "";
        }
    }

    private void deleteRecursive(File f) {
        if (f == null || !f.exists()) return;
        if (f.isDirectory()) {
            File[] children = f.listFiles();
            if (children != null) {
                for (File c : children) deleteRecursive(c);
            }
        }
        f.delete();
    }

    @PluginMethod
    public void getActiveVersion(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_OTA, Context.MODE_PRIVATE);
        JSObject ret = new JSObject();
        ret.put("version", prefs.getString("active_version", ""));
        ret.put("path", prefs.getString("active_path", ""));
        call.resolve(ret);
    }

    @PluginMethod
    public void downloadAndApply(PluginCall call) {
        final String urlStr = call.getString("url", "");
        final String version = call.getString("version", "");
        final boolean applyNow = call.getBoolean("applyNow", true);

        if (urlStr == null || urlStr.trim().isEmpty() || version == null || version.trim().isEmpty()) {
            call.reject("Missing OTA bundle url or version.");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection conn = null;
            File otaRoot = new File(getContext().getFilesDir(), "we4all_ota");
            File zipFile = new File(otaRoot, "bundle-" + version.replaceAll("[^a-zA-Z0-9._-]", "_") + ".zip");
            File extractDir = new File(new File(otaRoot, "bundles"), version.replaceAll("[^a-zA-Z0-9._-]", "_"));

            try {
                if (!otaRoot.exists()) otaRoot.mkdirs();
                if (zipFile.exists()) zipFile.delete();

                emitProgress(15, "Downloading WE4ALL v" + version + "...");
                URL url = new URL(urlStr);
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(25000);
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Cache-Control", "no-cache");

                int status = conn.getResponseCode();
                if (status < 200 || status >= 300) {
                    call.reject("OTA server returned HTTP " + status);
                    return;
                }
                String contentType = conn.getContentType();
                if (contentType != null && contentType.toLowerCase().contains("text/html")) {
                    call.reject("OTA URL returned HTML instead of a ZIP bundle.");
                    return;
                }

                long totalBytes = conn.getContentLengthLong();
                long downloadedBytes = 0;
                int lastReportedPct = 15;

                try (InputStream in = new BufferedInputStream(conn.getInputStream());
                     FileOutputStream out = new FileOutputStream(zipFile)) {
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        out.write(buf, 0, n);
                        downloadedBytes += n;
                        int pct = totalBytes > 0
                            ? 15 + (int) Math.min(60, (downloadedBytes * 60L) / totalBytes)
                            : Math.min(72, 18 + (int) (downloadedBytes / 65536L));
                        if (pct >= lastReportedPct + 4) {
                            lastReportedPct = pct;
                            emitProgress(pct, "Downloading WE4ALL v" + version + " (" + (downloadedBytes / 1024L) + " KB)...");
                        }
                    }
                    out.flush();
                }

                emitProgress(80, "Extracting WE4ALL v" + version + "...");
                deleteRecursive(extractDir);
                extractDir.mkdirs();
                String canonicalDest = extractDir.getCanonicalPath() + File.separator;

                try (ZipFile zf = new ZipFile(zipFile)) {
                    Enumeration<? extends ZipEntry> entries = zf.entries();
                    while (entries.hasMoreElements()) {
                        ZipEntry entry = entries.nextElement();
                        String entryName = entry.getName().replace('\\', '/');
                        File outFile = new File(extractDir, entryName);
                        if (!outFile.getCanonicalPath().startsWith(canonicalDest)) {
                            throw new SecurityException("Blocked invalid zip entry: " + entryName);
                        }
                        if (entry.isDirectory()) {
                            outFile.mkdirs();
                        } else {
                            File parent = outFile.getParentFile();
                            if (parent != null && !parent.exists()) parent.mkdirs();
                            try (InputStream zin = zf.getInputStream(entry);
                                 FileOutputStream zout = new FileOutputStream(outFile)) {
                                byte[] zbuf = new byte[16384];
                                int zn;
                                while ((zn = zin.read(zbuf)) != -1) {
                                    zout.write(zbuf, 0, zn);
                                }
                            }
                        }
                    }
                }

                zipFile.delete();
                File indexHtml = new File(extractDir, "index.html");
                if (!indexHtml.exists()) {
                    deleteRecursive(extractDir);
                    call.reject("Extracted OTA bundle is missing index.html.");
                    return;
                }

                emitProgress(95, "Activating WE4ALL v" + version + "...");
                String absPath = extractDir.getAbsolutePath();

                SharedPreferences capPrefs = getContext().getSharedPreferences(PREFS_CAP, Context.MODE_PRIVATE);
                capPrefs.edit().putString("serverBasePath", absPath).apply();

                SharedPreferences otaPrefs = getContext().getSharedPreferences(PREFS_OTA, Context.MODE_PRIVATE);
                otaPrefs.edit()
                    .putString("active_version", version)
                    .putString("active_path", absPath)
                    .putString("apk_version", getApkVersionName())
                    .apply();

                JSObject ret = new JSObject();
                ret.put("version", version);
                ret.put("path", absPath);
                ret.put("applied", applyNow);
                call.resolve(ret);

                if (applyNow && getActivity() != null && getBridge() != null) {
                    getActivity().runOnUiThread(() -> getBridge().getWebView().postDelayed(() -> {
                        getBridge().getWebView().clearCache(true);
                        getBridge().setServerBasePath(absPath);
                    }, 200));
                }
            } catch (Exception e) {
                call.reject("Native OTA error: " + (e.getMessage() != null ? e.getMessage() : e.toString()));
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }
}