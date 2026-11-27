import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  return {
    plugins: [
      react(),
      {
        name: "native-images",
        enforce: "pre",
        transform(code, id) {
          if (!id.endsWith("/src/App.tsx")) return;
          return code.replace(
            /require\("(\.\.\/assets\/[^"]+)"\)/g,
            (_, path) => `new URL("${path}", import.meta.url).href`,
          );
        },
      },
    ],
    publicDir: "web/public",
    optimizeDeps: {
      entries: ["web/main.tsx"],
      esbuildOptions: {
        resolveExtensions: [
          ".web.tsx",
          ".web.ts",
          ".web.js",
          ".tsx",
          ".ts",
          ".js",
          ".json",
        ],
      },
    },
    resolve: {
      extensions: [
        ".web.tsx",
        ".web.ts",
        ".web.js",
        ".mjs",
        ".js",
        ".ts",
        ".tsx",
        ".json",
      ],
      alias: [
        {
          find: "react-native-qrcode-svg",
          replacement: fileURLToPath(
            new URL("./web/QRCode.tsx", import.meta.url),
          ),
        },
        {
          find: "react-native-svg",
          replacement: fileURLToPath(new URL("./web/svg.tsx", import.meta.url)),
        },
        { find: /^react-native$/, replacement: "react-native-web" },
        {
          find: "expo-status-bar",
          replacement: fileURLToPath(
            new URL("./web/status-bar.tsx", import.meta.url),
          ),
        },
        {
          find: "expo-secure-store",
          replacement: fileURLToPath(
            new URL("./web/secure-store.ts", import.meta.url),
          ),
        },
        {
          find: "react-native-maps",
          replacement: fileURLToPath(
            new URL("./web/MapView.tsx", import.meta.url),
          ),
        },
      ],
    },
    define: {
      global: "globalThis",
      "process.env.EXPO_PUBLIC_SUPPORT_EMAIL": JSON.stringify(
        env.EXPO_PUBLIC_SUPPORT_EMAIL || "",
      ),
      "process.env.EXPO_PUBLIC_SUPABASE_URL": JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || "",
      ),
      "process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          "",
      ),
      "process.env.EXPO_PUBLIC_PORTAL_URL": JSON.stringify(
        env.EXPO_PUBLIC_PORTAL_URL || "https://bedrift.dinvenn.app",
      ),
    },
    build: { outDir: "dist-web" },
  };
});
