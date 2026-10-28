// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MentorPoolForm } from "./mentor-pool-form";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fill() {
  fireEvent.change(screen.getByLabelText(/이름 또는 활동명/), { target: { value: "테스트" } });
  fireEvent.change(screen.getByLabelText(/연락받을 이메일/), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText(/어떤 사람을 만나고 싶나요/), { target: { value: "새로운 도전을 해본 사람" } });
  fireEvent.change(screen.getByLabelText(/만나고 싶은 이유나/), { target: { value: "새로운 동네에서 시작한 경험을 듣고 싶습니다." } });
  fireEvent.click(screen.getByLabelText(/위 개인정보 수집/));
}
describe("모집 폼", () => {
  it("멘토 신청에서는 경력을 강제하지 않고 경험을 묻는다", () => { render(<MentorPoolForm initialKind="mentor" />); expect(screen.getByLabelText(/어떤 경험을 나눌 수 있나요/)).toBeDefined(); });
  it("저장 실패 후 입력과 재시도 식별자를 보존하고 성공한 뒤에만 완료를 표시한다", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ error: "저장 실패" }, { status: 503 })).mockResolvedValueOnce(Response.json({ ok: true }, { status: 201 }));
    vi.stubGlobal("fetch", fetcher); render(<MentorPoolForm initialKind="mentee" />); fill();
    fireEvent.submit(screen.getByRole("button", { name: /무료로 참여 희망/ }).closest("form")!);
    await screen.findByRole("alert"); expect((screen.getByLabelText(/이름 또는 활동명/) as HTMLInputElement).value).toBe("테스트");
    expect(screen.queryByText("참여 희망을 남겨 주셔서 고마워요.")).toBeNull();
    fireEvent.submit(screen.getByRole("button", { name: /무료로 참여 희망/ }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("만남이 확정된 것은 아니에요"));
    expect(JSON.parse(fetcher.mock.calls[0][1].body).submissionId).toBe(JSON.parse(fetcher.mock.calls[1][1].body).submissionId);
  });
});
