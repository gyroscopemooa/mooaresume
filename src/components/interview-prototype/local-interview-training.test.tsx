// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalInterviewProPrototype } from "./local-interview-prototype";
const mocks = vi.hoisted(() => ({ studio: vi.fn(), devices: vi.fn() }));
vi.mock("./training-setup", () => ({ TrainingSetup: () => null }));
vi.mock("./camera-setup-guide", () => ({ CameraSetupGuide: () => null }));
vi.mock("./media-analysis-studio", () => ({ MediaAnalysisStudio: (props: unknown) => { mocks.studio(props); return <div>테스트 결과 연결</div>; } }));
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); vi.stubGlobal("scrollTo", vi.fn()); Object.defineProperty(navigator,"mediaDevices",{ configurable:true,value:{ getUserMedia:mocks.devices,enumerateDevices:vi.fn().mockResolvedValue([]) } }); vi.stubGlobal("MediaRecorder", class { static isTypeSupported() { return true; } }); vi.stubGlobal("speechSynthesis",{ cancel:vi.fn(),speak:vi.fn() }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function textPractice() { render(<LocalInterviewProPrototype/>); fireEvent.click(screen.getByRole("button",{name:"장비 확인"})); fireEvent.click(screen.getByLabelText("키보드·모바일 타자")); fireEvent.click(screen.getByLabelText("질문을 음성으로 읽어주기")); fireEvent.click(screen.getByRole("button",{name:"실전 연습 시작"})); fireEvent.click(screen.getByRole("button",{name:"이 질문 시작"})); fireEvent.click(screen.getByRole("button",{name:"바로 답변 시작"})); }
describe("interview alternative inputs", () => {
  it("runs typed interview without camera or microphone and passes actual answer to report", async () => { await textPractice(); fireEvent.change(screen.getByRole("textbox",{name:/내 답변/}),{target:{value:"작업표를 정리하고 교대 인수인계 누락 항목을 팀과 확인했습니다."}}); await act(async()=>vi.advanceTimersByTime(2000)); fireEvent.click(screen.getByRole("button",{name:"답변 종료"})); fireEvent.click(screen.getByRole("button",{name:"답변 피드백·꼬리질문 보기"})); expect(mocks.devices).not.toHaveBeenCalled(); expect(mocks.studio).toHaveBeenLastCalledWith(expect.objectContaining({ recordings:[expect.objectContaining({answerText:"작업표를 정리하고 교대 인수인계 누락 항목을 팀과 확인했습니다.",mimeType:"text/plain"})] })); });
  it("does not save an empty typed answer", async () => { await textPractice(); fireEvent.click(screen.getByRole("button",{name:"답변 종료"})); expect(screen.getByText(/빈 답변은 저장하지 않습니다/)).toBeTruthy(); expect(mocks.studio).not.toHaveBeenCalled(); });
  it("requests no video track in microphone-only mode", async () => { mocks.devices.mockRejectedValue(new DOMException("missing","NotFoundError")); render(<LocalInterviewProPrototype/>); fireEvent.click(screen.getByRole("button",{name:"장비 확인"})); fireEvent.click(screen.getByLabelText("마이크만")); await act(async()=>fireEvent.click(screen.getByRole("button",{name:"마이크 확인 시작"}))); expect(mocks.devices).toHaveBeenCalledWith(expect.objectContaining({video:false,audio:expect.any(Object)})); });
});
