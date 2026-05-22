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
  plugins: {},
};

export default config;
