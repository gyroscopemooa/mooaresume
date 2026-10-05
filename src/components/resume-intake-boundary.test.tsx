// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResumeIntake } from "./resume-intake";
import { createCoverLetterQuestion, serializeQuestionAnswers } from "@/domain/cover-letter-question";
const ambiguous = "1. 경험을 설명하세요(프로젝트\n내 답변";
vi.mock("@/lib/local-document", () => ({ extractLocalDocument: async () => ({ text: ambiguous, filename: "지원서.pdf", extension: "pdf", sizeBytes: 123 }) }));
afterEach(cleanup);
function Harness() {
  const [questions, setQuestions] = useState([createCoverLetterQuestion()]);
  return <><ResumeIntake questions={questions} onChange={setQuestions}/><output data-testid="submitted">{serializeQuestionAnswers(questions)}</output></>;
}
function correct() {
  fireEvent.click(screen.getByRole("button", { name: /구분을 확인해/ }));
  fireEvent.change(screen.getByLabelText("질문"), { target: { value: "경험을 설명하세요(프로젝트)" } });
  fireEvent.change(screen.getByLabelText("내 답변"), { target: { value: "실제 제출할 수정 답변" } });
  fireEvent.click(screen.getByRole("button", { name: "확인 완료" }));
}
it("connects paste correction to serialized submission", () => {
  render(<Harness/>);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: ambiguous } });
  correct();
  fireEvent.click(screen.getByRole("button", { name: "문항 구분 확인하기" }));
  expect(screen.getByTestId("submitted").textContent).toContain("경험을 설명하세요(프로젝트)");
  expect(screen.getByTestId("submitted").textContent).toContain("실제 제출할 수정 답변");
});
it("connects extracted PDF correction to serialized submission", async () => {
  const { container } = render(<Harness/>);
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["synthetic"], "지원서.pdf", { type: "application/pdf" })] } });
  await waitFor(() => expect(screen.getByRole("button", { name: /구분을 확인해/ })).toBeTruthy());
  correct();
  expect(screen.getByTestId("submitted").textContent).toContain("실제 제출할 수정 답변");
});
it("preserves existing limits, identities, and untouched questions", () => {
  const first = { ...createCoverLetterQuestion("내 답변"), prompt: "경험을 설명하세요(프로젝트", targetLength: 700 };
  const second = { ...createCoverLetterQuestion("둘째 답변"), title: "소제목", prompt: "두 번째 질문", targetLength: 500 };
  const onChange = vi.fn();
  render(<ResumeIntake questions={[first, second]} onChange={onChange}/>);
  correct();
  const result = onChange.mock.calls[0][0];
  expect(result[0]).toMatchObject({ id: first.id, targetLength: 700, answer: "실제 제출할 수정 답변" });
  expect(result[1]).toEqual(second);
});
