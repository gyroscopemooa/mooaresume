// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InputBoundaryReview } from "./input-boundary-review";
afterEach(cleanup);
function Harness() {
  const [text, setText] = useState("1. 경험을 설명하세요(프로젝트\n내 답변");
  return <><InputBoundaryReview text={text} onChange={setText}/><output>{text}</output></>;
}
describe("compact input boundary review", () => {
  it("is completely absent for normal input", () => {
    const { container } = render(<InputBoundaryReview text="1. 지원동기\n답변" onChange={() => {}}/>);
    expect(container.innerHTML).toBe("");
  });
  it("expands only on request and applies edits to parent data", () => {
    render(<Harness/>);
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /구분을 확인/ }));
    fireEvent.change(screen.getByLabelText("질문"), { target: { value: "경험을 설명하세요(프로젝트)" } });
    fireEvent.change(screen.getByLabelText("내 답변"), { target: { value: "수정한 답변" } });
    fireEvent.click(screen.getByRole("button", { name: "확인 완료" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("수정한 답변");
  });
  it("accepts acknowledgement without changing the original wording", () => {
    render(<Harness/>);
    fireEvent.click(screen.getByRole("button", { name: /구분을 확인/ }));
    fireEvent.click(screen.getByRole("button", { name: "확인 완료" }));
    expect(screen.queryByRole("button")).toBeNull();
  });
});
