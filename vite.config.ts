import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "https://blog.ltlyl.fun/react-clone/", // 修改为完整的URL
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
  ],
});
