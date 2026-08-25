// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MailComposer } from "./mail-composer";

afterEach(cleanup);

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ ok: true, sent: 1 }) });
  vi.stubGlobal("fetch", fetchMock);
});

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText(/담당자@학교/), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "제목" } });
  fireEvent.change(screen.getByPlaceholderText("안녕하세요..."), { target: { value: "본문" } });
}

function filePicker() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function attach(files: File[]) {
  Object.defineProperty(filePicker(), "files", { value: files, configurable: true });
  fireEvent.change(filePicker());
}

function submit() {
  fireEvent.submit(document.querySelector("form") as HTMLFormElement);
}

describe("MailComposer 첨부파일", () => {
  it("고른 파일의 이름과 크기를 보여 준다", () => {
    render(<MailComposer />);
    attach([new File([new Uint8Array(2048)], "포스터.png", { type: "image/png" })]);

    expect(screen.getByText("포스터.png")).toBeTruthy();
    // Says out loud that this one lands in the body, not just at the bottom.
    expect(screen.getByText("2KB · 본문에 표시")).toBeTruthy();
  });

  it("사진이 아닌 파일에는 본문 표시 안내를 붙이지 않는다", () => {
    render(<MailComposer />);
    attach([new File([new Uint8Array(1024)], "안내.pdf", { type: "application/pdf" })]);

    expect(screen.getByText("안내.pdf")).toBeTruthy();
    expect(screen.queryByText(/본문에 표시/)).toBeNull();
  });

  it("두 번째로 고른 파일이 첫 번째를 지우지 않는다", () => {
    render(<MailComposer />);
    attach([new File([new Uint8Array(10)], "하나.pdf", { type: "application/pdf" })]);
    attach([new File([new Uint8Array(10)], "둘.pdf", { type: "application/pdf" })]);

    expect(screen.getByText("하나.pdf")).toBeTruthy();
    expect(screen.getByText("둘.pdf")).toBeTruthy();
    expect(screen.getByText("합계 2개")).toBeTruthy();
  });

  it("빼기를 누르면 목록에서 사라진다", () => {
    render(<MailComposer />);
    attach([new File([new Uint8Array(10)], "하나.pdf", { type: "application/pdf" })]);
    fireEvent.click(screen.getByRole("button", { name: "빼기" }));

    expect(screen.queryByText("하나.pdf")).toBeNull();
  });

  it("너무 큰 파일은 올리기도 전에 이 자리에서 거절한다", () => {
    // The point of checking here is that the operator does not wait through a
    // 6MB upload only to be told no.
    render(<MailComposer />);
    attach([new File([new Uint8Array(6 * 1024 * 1024)], "큰.pdf", { type: "application/pdf" })]);

    expect(screen.getByText(/파일 하나는 5.0MB까지 가능합니다: 큰.pdf/)).toBeTruthy();
    expect(screen.queryByText("큰.pdf")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("파일을 multipart로 실어 보낸다", async () => {
    render(<MailComposer />);
    fillRequiredFields();
    attach([new File([new Uint8Array(10)], "포스터.png", { type: "image/png" })]);
    submit();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/mail/send");
    const form = init.body as FormData;
    expect(form.get("to")).toBe("a@b.com");
    expect(form.get("subject")).toBe("제목");
    expect(form.get("body")).toBe("본문");
    expect((form.getAll("attachments")[0] as File).name).toBe("포스터.png");
    // A Content-Type set by hand would be missing the multipart boundary.
    expect(init.headers).toBeUndefined();
  });

  it("보내고 나면 첨부 목록도 비운다", async () => {
    render(<MailComposer />);
    fillRequiredFields();
    attach([new File([new Uint8Array(10)], "포스터.png", { type: "image/png" })]);
    submit();

    await waitFor(() => expect(screen.getByText("1명에게 보냈습니다.")).toBeTruthy());
    expect(screen.queryByText("포스터.png")).toBeNull();
  });

  it("실패한 주소가 있으면 첨부를 그대로 남겨 다시 보낼 수 있게 한다", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, sent: 1, failedRecipients: ["c@d.com"] }) });
    render(<MailComposer />);
    fillRequiredFields();
    attach([new File([new Uint8Array(10)], "포스터.png", { type: "image/png" })]);
    submit();

    await waitFor(() => expect(screen.getByText(/실패: c@d.com/)).toBeTruthy());
    expect(screen.getByText("포스터.png")).toBeTruthy();
  });
});
