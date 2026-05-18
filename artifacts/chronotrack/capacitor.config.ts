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
      clientId: "515465540862-rgosg8keesnplj4jnvj5jcoqp6qcisgt.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      serverClientId: "515465540862-rgosg8keesnplj4jnvj5jcoqp6qcisgt.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
