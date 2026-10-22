// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ExtraReviewSend } from "./extra-review-send";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
const props = { runId: "11111111-1111-4111-8111-111111111111", previewId: "22222222-2222-4222-8222-222222222222", ownerEmail: "owner@example.com", sentToOwner: 1 };

describe("ExtraReviewSend", () => {
  it("sends a preview to the typed address and remembers it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, sent: 1 })));
    render(<ExtraReviewSend {...props} />);
    fireEvent.change(screen.getByLabelText("미리 받을 메일"), { target: { value: "me@example.com" } });
    fireEvent.click(screen.getByText("나에게 미리 보내기"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("미리 보내기 완료"));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ to: "me@example.com", send: true, previewId: props.previewId });
    expect(localStorage.getItem("mooa:extra-review-preview-email")).toBe("me@example.com");
  });
  it("retries a cold-start failure once with the same request id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "DELIVERY_FAILED_RETRY_SAME_REQUEST" }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, sent: 1 })));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ExtraReviewSend {...props} />);
    fireEvent.click(screen.getByText("고객에게 보내기"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("고객 발송 완료"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).requestId).toBe(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).requestId);
  });
  it("compact list version asks for the preview address once and remembers it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, sent: 1 })));
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("me@example.com");
    render(<ExtraReviewSend {...props} compact />);
    expect(screen.queryByLabelText("미리 받을 메일")).toBeNull();
    fireEvent.click(screen.getByText("나에게 미리 보내기"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).to).toBe("me@example.com");
    fireEvent.click(screen.getByText("나에게 미리 보내기"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(prompt).toHaveBeenCalledOnce();
  });
  it("asks before sending to the customer, warns about earlier sends, and never sends a typed address", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, sent: 1 })));
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<ExtraReviewSend {...props} />);
    fireEvent.click(screen.getByText("고객에게 보내기"));
    expect(confirm.mock.calls[0][0]).toContain("owner@example.com");
    expect(confirm.mock.calls[0][0]).toContain("이미 1번");
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("고객에게 보내기"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(sent.toOwner).toBe(true);
    expect(sent.to).toBeUndefined();
  });
});
