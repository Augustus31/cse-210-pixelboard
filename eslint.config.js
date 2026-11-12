import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist/", "node_modules/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      camelcase: ["error", { properties: "never" }],
      "max-len": ["error", { code: 100, ignoreUrls: true }],
    },
  },
]);
