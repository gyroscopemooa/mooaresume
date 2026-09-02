import { renderMarkIcon } from "../icon-mark";

/** `manifest.ts`의 512×512 아이콘. 안드로이드가 스플래시 화면에 씁니다. */
export const dynamic = "force-static";

export async function GET() {
  return renderMarkIcon(512);
}
