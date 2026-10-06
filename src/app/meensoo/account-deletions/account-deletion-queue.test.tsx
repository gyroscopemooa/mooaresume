// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountDeletionQueue } from "./account-deletion-queue";

describe("AccountDeletionQueue", () => {
  it("메일 등록, 가입 이메일 연결, 삭제 전 확인 단계를 분리해 보여 준다", () => {
    render(<AccountDeletionQueue initialRequests={[{
      id: "11111111-1111-4111-8111-111111111111",
      source: "ADMIN_EMAIL",
      requesterEmail: "sender@example.com",
      accountEmail: "sender@example.com",
      userId: null,
      status: "NEEDS_ACCOUNT_EMAIL",
      noticeStatus: "PENDING",
      errorCode: null,
      deleteAttempts: 0,
      requestedAt: "2026-10-07T00:00:00.000Z",
      completedAt: null,
    }]} />);
    expect(screen.getByRole("heading", { name: "계정 삭제 요청" })).toBeTruthy();
    expect(screen.getByLabelText("메일을 보낸 주소")).toBeTruthy();
    expect(screen.getByPlaceholderText("실제 가입 이메일")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "계정과 데이터 영구 삭제" })).toBeNull();
  });

  it("완료 메일이 성공한 요청에는 개인정보 제거 상태를 표시한다", () => {
    render(<AccountDeletionQueue initialRequests={[{
      id: "22222222-2222-4222-8222-222222222222",
      source: "ADMIN_EMAIL",
      requesterEmail: null,
      accountEmail: null,
      userId: null,
      status: "COMPLETED",
      noticeStatus: "SENT",
      errorCode: null,
      deleteAttempts: 1,
      requestedAt: "2026-10-07T00:00:00.000Z",
      completedAt: "2026-10-07T01:00:00.000Z",
    }]} />);
    expect(screen.getByText("완료 메일 발송됨 · 개인정보 주소 제거됨")).toBeTruthy();
  });
});
