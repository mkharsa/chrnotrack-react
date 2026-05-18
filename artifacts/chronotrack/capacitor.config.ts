import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "chrono.track",
  appName: "ChronoTrack",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      releaseType: "APK",
    },
  },
  plugins: {
    GoogleAuth: {
      // Web Client ID from Firebase Console → Auth → Sign-in method → Google → Web SDK configuration
      clientId: "REPLACE_WITH_YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      serverClientId: "REPLACE_WITH_YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
