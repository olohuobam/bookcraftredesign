package com.bookcraft.app;

import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.firebase.messaging.FirebaseMessaging;

/**
 * FcmTokenPlugin — Native Capacitor plugin that fetches the FCM device token
 * directly via FirebaseMessaging.getInstance().getToken().
 *
 * Why this exists:
 * When Capacitor loads content from a remote URL (server.url), the async
 * event listeners from @capacitor/push-notifications (notifyListeners)
 * often fail to deliver the 'registration' event back to JS. The token
 * is fetched natively but never bridges to the WebView.
 *
 * This plugin bypasses that issue by resolving the PluginCall directly
 * with the token — a synchronous request-response pattern that works
 * reliably even with remote URLs.
 */
@CapacitorPlugin(name = "FcmToken")
public class FcmTokenPlugin extends Plugin {

    private static final String TAG = "FcmTokenPlugin";

    @PluginMethod
    public void getToken(PluginCall call) {
        Log.d(TAG, "getToken() called — requesting FCM token from Firebase SDK");

        try {
            FirebaseMessaging.getInstance().getToken()
                .addOnSuccessListener(token -> {
                    Log.d(TAG, "FCM token received: " + token.substring(0, Math.min(10, token.length())) + "...");
                    JSObject result = new JSObject();
                    result.put("token", token);
                    call.resolve(result);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "FCM token request failed", e);
                    call.reject("FCM token request failed: " + e.getMessage(), e);
                });
        } catch (Exception e) {
            Log.e(TAG, "FirebaseMessaging not available", e);
            call.reject("FirebaseMessaging not available: " + e.getMessage(), e);
        }
    }
}
