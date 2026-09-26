// 두 검증을 차례로 돌린다. 하나라도 실패하면 종료 코드가 0 이 아니다.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

let failed = false;
for (const name of ["test-main.mjs", "test-legacy-and-expiry.mjs"]) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`./${name}`, import.meta.url)), ...process.argv.slice(2)], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
