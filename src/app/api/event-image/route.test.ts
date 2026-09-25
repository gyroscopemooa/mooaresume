import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const HASH = "6f1714d4d4311f61e4f71967fbc3fd7d448167efd7be24d6873039fef706a4d8";
const good = `https://runtime.live-sub.com/api/runtime/media/events/${HASH}.png`;
const call = (src: string | null) => GET(new Request(`http://localhost/api/event-image${src === null ? "" : `?src=${encodeURIComponent(src)}`}`));

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/event-image", () => {
  it("허용되지 않는 주소는 HQ 에 요청하지 않고 400", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await call("https://evil.example/x.png")).status).toBe(400);
    expect((await call("http://169.254.169.254/latest/meta-data")).status).toBe(400);
    expect((await call(null)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("이미지를 첨부 파일로 바꿔 내려준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } })));
    const response = await call(good);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="mooaresume-event-6f1714d4.png"');
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await response.arrayBuffer()).byteLength).toBe(3);
  });

  it("이미지가 아닌 응답·실패·너무 큰 파일은 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200, headers: { "content-type": "text/html" } })));
    expect((await call(good)).status).toBe(502);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x", { status: 404, headers: { "content-type": "image/png" } })));
    expect((await call(good)).status).toBe(502);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x", { status: 200, headers: { "content-type": "image/png", "content-length": String(9 * 1024 * 1024) } })));
    expect((await call(good)).status).toBe(502);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect((await call(good)).status).toBe(502);
  });
});
