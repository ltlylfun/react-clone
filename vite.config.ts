import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "/react-clone/",
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
  ],
});
