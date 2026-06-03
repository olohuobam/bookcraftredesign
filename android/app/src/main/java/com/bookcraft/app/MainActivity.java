package com.bookcraft.app;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Required for Android 15+ (targetSdk 35+): app must render edge-to-edge
        // and handle window insets itself. The body in globals.css applies
        // env(safe-area-inset-*) so the WebView content stays inside the safe area.
        EdgeToEdge.enable(this);

        // Register native plugins before super.onCreate() so they're available on first bridge init
        registerPlugin(FcmTokenPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
