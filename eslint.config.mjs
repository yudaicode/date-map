import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ここから追加:
    // public/ は配信するだけのファイル置き場。
    // とくに public/maplibre/ は MapLibre から自動コピーした巨大ファイルなので、
    // 書き方チェックの対象から外す（自分で書いたコードではないため）。
    "public/**",
  ]),
]);

export default eslintConfig;
