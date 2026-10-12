import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// One Worker serves both domains. In development open world.localhost:3000 (staff) and
// app.localhost:3000 (members, coaches, the counter QR). See src/routing/surface.ts.
export default defineConfig({
  // The Firebase plugin's web fallback imports the web SDK; SUPER1 only pushes in the native shells.
  resolve: { tsconfigPaths: true, alias: { "firebase/messaging": fileURLToPath(new URL("./src/client/firebaseWebStub.ts", import.meta.url)) } },
  server: { port: 3000, strictPort: true, host: true, allowedHosts: [".localhost", "localhost", "127.0.0.1"] },
  preview: { port: 3000, allowedHosts: [".localhost", "localhost", "127.0.0.1"] },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({ srcDirectory: "src", router: { routesDirectory: "routes" } }),
    viteReact(),
  ],
});
