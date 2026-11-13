import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend is meant to run on its own machine and talk to the three
// backends over the LAN (see src/lib/settings.tsx), so `--host` is the
// normal way to run this: `npm run dev -- --host`.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  preview: {
    port: 5174,
  },
});
