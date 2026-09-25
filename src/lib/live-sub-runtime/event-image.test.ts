import { describe, expect, it } from "vitest";
import { eventImageDownloadHref, eventImageFileName, parseEventImageSource } from "./event-image";

const HASH = "6f1714d4d4311f61e4f71967fbc3fd7d448167efd7be24d6873039fef706a4d8";
const good = `https://runtime.live-sub.com/api/runtime/media/events/${HASH}.png`;
const bases = ["https://runtime.live-sub.com"];

describe("이벤트 이미지 저장 주소 검사", () => {
  it("설정된 HQ 주소의 미디어 경로 한 가지 모양만 통과", () => {
    expect(parseEventImageSource(good, bases)).toEqual({ url: good, hash: HASH, extension: "png" });
    expect(parseEventImageSource(good.replace(".png", ".jpeg"), bases)?.extension).toBe("jpg");
    expect(parseEventImageSource(good.replace(".png", ".webp"), bases)?.extension).toBe("webp");
  });

  it("다른 사이트·다른 경로·꼬리표가 붙은 주소는 모두 거절(아무 주소나 대신 받아 주지 않는다)", () => {
    const bad = [
      `https://evil.example/api/runtime/media/events/${HASH}.png`,
      `https://runtime.live-sub.com.evil.example/api/runtime/media/events/${HASH}.png`,
      `http://runtime.live-sub.com/api/runtime/media/events/${HASH}.png`,
      `https://runtime.live-sub.com/api/runtime/config`,
      `https://runtime.live-sub.com/api/runtime/media/events/../../secret.png`,
      `https://runtime.live-sub.com/api/runtime/media/events/${HASH}.svg`,
      `https://runtime.live-sub.com/api/runtime/media/events/short.png`,
      `${good}?x=1`,
      `${good}#frag`,
      `https://user:pw@runtime.live-sub.com/api/runtime/media/events/${HASH}.png`,
      "javascript:alert(1)", "", "not a url",
    ];
    for (const value of bad) expect(parseEventImageSource(value, bases), value).toBeNull();
    expect(parseEventImageSource(undefined, bases)).toBeNull();
    expect(parseEventImageSource("x".repeat(400), bases)).toBeNull();
  });

  it("저장 링크는 같은 도메인 통로로 만들고, 허용되지 않는 이미지는 링크가 없다", () => {
    expect(eventImageDownloadHref(good, bases)).toBe(`/api/event-image?src=${encodeURIComponent(good)}`);
    expect(eventImageDownloadHref("https://evil.example/a.png", bases)).toBeNull();
    expect(eventImageDownloadHref(undefined, bases)).toBeNull();
  });

  it("파일 이름은 짧고 안전하다", () => {
    expect(eventImageFileName(parseEventImageSource(good, bases)!)).toBe("mooaresume-event-6f1714d4.png");
  });
});
