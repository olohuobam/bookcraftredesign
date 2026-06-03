import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.bookcraft.app',
  appName: 'Bookcraft',
  webDir: 'public', // Use public folder for hybrid mode

  // HYBRID APPROACH: Mobile app connects to web server
  // For development: use local IP or ngrok
  // For production: use your production URL
  server: {
    url: process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bookcraft.dev',
    // Only allow cleartext (HTTP) in development, enforce HTTPS in production
    cleartext: process.env.NODE_ENV !== 'production',
    androidScheme: 'https',
    iosScheme: 'https',
  },

  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },

    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2563eb',
    },

    // Push notifications — device token registration for remote push (FCM/APNs)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Local notifications — used for immediate in-session book-ready triggers
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#2563eb',
    },
  },
};

export default config;

