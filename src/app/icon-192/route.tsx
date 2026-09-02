import { renderMarkIcon } from "../icon-mark";

/** `manifest.ts`의 192×192 아이콘. 값이 바뀌지 않으므로 빌드 시점에 한 번만 그립니다. */
export const dynamic = "force-static";

export async function GET() {
  return renderMarkIcon(192);
}
