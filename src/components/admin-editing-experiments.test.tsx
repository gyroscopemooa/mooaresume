// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminEditingExperiments } from "./admin-editing-experiments";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("관리자 수동 시험 화면", () => {
  it("화면을 여는 것만으로 조회/AI 호출하지 않는다", () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<AdminEditingExperiments runId="run"/>);
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByText(/고객이 받은 결과·결제·이용권은 바뀌지 않습니다/)).toBeTruthy();
  });
  it("꺼진 기능에서는 유료 단계로 가지 않는다", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ enabled: false, experiments: [] })));
    vi.stubGlobal("fetch", fetcher); render(<AdminEditingExperiments runId="run"/>);
    fireEvent.click(screen.getByRole("button", { name: "시험 기록 조회" }));
    await waitFor(() => expect(screen.getByRole<HTMLButtonElement>("button", { name: "재작성 시험 자료 준비" }).disabled).toBe(true));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
