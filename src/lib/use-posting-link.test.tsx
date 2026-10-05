// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePostingLink } from "./use-posting-link";
afterEach(() => {cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
describe("automatic posting intake", () => {
  it("delivers fetched content to the input without a confirm click", async () => {
    vi.useFakeTimers();
    const fetcher=vi.fn().mockResolvedValue(Response.json({ok:true,text:"담당업무 개발과 협업",truncated:false}));
    vi.stubGlobal("fetch",fetcher);
    const deliver=vi.fn();
    const hook=renderHook(() => usePostingLink("https://example.com/jobs",deliver));
    await act(async () => {await vi.advanceTimersByTimeAsync(750);});
    expect(deliver).toHaveBeenCalledWith("담당업무 개발과 협업","https://example.com/jobs",false);
    expect(hook.result.current.message).toContain("입력 자료에 반영");
  });
  it("does not deliver image-only or URL-only data as a successful body", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({ok:false,reason:"IMAGE_ONLY"})));
    const deliver=vi.fn();
    const hook=renderHook(() => usePostingLink("https://example.com/jobs",deliver));
    await act(async () => {await vi.advanceTimersByTimeAsync(750);});
    expect(deliver).not.toHaveBeenCalled();
    expect(hook.result.current.message).toContain("공고 대조는 제외");
  });
  it("ignores a stale response after the user changes the link", async () => {
    vi.useFakeTimers();
    let resolve: (value:Response)=>void=()=>{};
    vi.stubGlobal("fetch",vi.fn().mockImplementation(()=>new Promise<Response>(r=>{resolve=r;})));
    const deliver=vi.fn();
    const hook=renderHook(({url})=>usePostingLink(url,deliver),{initialProps:{url:"https://example.com/old"}});
    await act(async()=>{await vi.advanceTimersByTimeAsync(750);});
    hook.rerender({url:"https://example.com/new"});
    await act(async()=>{resolve(Response.json({ok:true,text:"이전 공고 본문"}));});
    expect(deliver).not.toHaveBeenCalled();
  });
});
