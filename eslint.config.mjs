import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // artifacts/**는 앱 소스가 아니라 빌드 산출물과 스토어 자산 생성 스크립트입니다
  // (Node CommonJS로 직접 실행하므로 Next 규칙을 적용할 대상이 아닙니다).
  globalIgnores([".next/**", ".open-next/**", "node_modules/**", "apps/mobile/dist/**", "apps/mobile/android/**", "apps/mobile/ios/**", "apps/mobile/.expo/**", "apps/mobile/.gradle-cache/**", "artifacts/**"]),
]);
