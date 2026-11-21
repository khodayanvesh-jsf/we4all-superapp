package com.we4all.superapp;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            String currentApkVer = info.versionName != null ? info.versionName : "";
            SharedPreferences otaPrefs = getSharedPreferences("We4AllOtaPrefs", Context.MODE_PRIVATE);
            String savedApkVer = otaPrefs.getString("apk_version", "");
            if (!savedApkVer.isEmpty() && !savedApkVer.equals(currentApkVer)) {
                getSharedPreferences("CapWebViewSettings", Context.MODE_PRIVATE).edit().remove("serverBasePath").apply();
                otaPrefs.edit().remove("active_version").remove("active_path").putString("apk_version", currentApkVer).apply();
            }
        } catch (Exception ignored) {}

        registerPlugin(We4AllOtaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}