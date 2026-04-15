import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.cloudduty.fomodoro",
  appName: "FomoDoro",
  webDir: "out",
  server: {
    url: "https://fomoodoro.vercel.app",
    androidScheme: "https",
  },
};

export default config;
