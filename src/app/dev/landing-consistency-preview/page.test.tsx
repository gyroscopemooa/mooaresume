// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Preview, { metadata, viewport } from "./page";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("PREVIEW_NOT_FOUND"); } }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("isolated landing comparison", () => {
  it("is not available in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(Preview({ searchParams: Promise.resolve({ variant: "b" }) })).rejects.toThrow("PREVIEW_NOT_FOUND");
  });
  it("shows only the selected original A or proposed B", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const a = render(await Preview({ searchParams: Promise.resolve({ variant: "a" }) }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("자소서 첨삭 결과는");
    expect(screen.getByRole("link", { name: "A · 클로드 원본" }).getAttribute("aria-current")).toBe("page");
    a.unmount();
    render(await Preview({ searchParams: Promise.resolve({ variant: "b" }) }));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("판단 기준은 일관되게");
    expect(screen.getByRole("link", { name: "B · 코덱스 제안" }).getAttribute("aria-current")).toBe("page");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(viewport).toEqual({ width: "device-width", initialScale: 1 });
  });
});
