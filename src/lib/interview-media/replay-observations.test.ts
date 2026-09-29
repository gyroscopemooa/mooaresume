// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startReplayObservations } from "./replay-observations";

const mocks = vi.hoisted(() => ({ faceCreate: vi.fn(), poseCreate: vi.fn(), files: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({
  FaceLandmarker: { createFromOptions: mocks.faceCreate },
  PoseLandmarker: { createFromOptions: mocks.poseCreate },
  FilesetResolver: { forVisionTasks: mocks.files },
}));

function detector(kind: "face" | "pose") {
  return { close: vi.fn(), setOptions: vi.fn(async () => undefined), detectForVideo: vi.fn(() => kind === "face" ? { faceLandmarks: [] } : { landmarks: [], close: vi.fn() }) };
}
function videoFixture() {
  const video = document.createElement("video");
  Object.defineProperties(video, { videoWidth: {value:1280,configurable:true}, videoHeight: {value:720,configurable:true}, readyState: {value:2,configurable:true}, paused: {value:false,configurable:true}, ended: {value:false,configurable:true}, seeking: {value:false,configurable:true} });
  let callback: VideoFrameRequestCallback | null = null;
  video.requestVideoFrameCallback = vi.fn((next:VideoFrameRequestCallback) => { callback=next; return 42; });
  video.cancelVideoFrameCallback = vi.fn();
  return {video, tick: (time:number) => { video.currentTime=time; callback?.(performance.now(), {mediaTime:time,presentedFrames:1,expectedDisplayTime:0,presentationTime:0,width:1280,height:720,processingDuration:0}); }};
}
async function flush() { for(let i=0;i<12;i++) await Promise.resolve(); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D);
  vi.stubGlobal("requestAnimationFrame",vi.fn(() => 3));
  vi.stubGlobal("cancelAnimationFrame",vi.fn());
  vi.stubGlobal("fetch",vi.fn(async () => ({ok:true,headers:new Headers({"content-type":"application/octet-stream"}),arrayBuffer:async()=>new ArrayBuffer(200_000)})));
  Object.defineProperty(document,"hidden",{value:false,configurable:true});
  mocks.files.mockResolvedValue({});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("local replay tracking lifecycle", () => {
  it("loads only same-origin models and measures actual video frames, never camera input", async () => {
    const face=detector("face"),pose=detector("pose"); mocks.faceCreate.mockResolvedValue(face); mocks.poseCreate.mockResolvedValue(pose);
    const {video,tick}=videoFixture(); const onFrame=vi.fn(); const onStatus=vi.fn();
    const stop=await startReplayObservations(video,{signal:new AbortController().signal,onFrame,onStatus});
    expect(fetch).toHaveBeenCalledWith("/interview-analysis/mediapipe/face_landmarker.task",expect.objectContaining({credentials:"same-origin",redirect:"error"}));
    expect(fetch).toHaveBeenCalledWith("/interview-analysis/mediapipe/pose_landmarker_lite.task",expect.objectContaining({credentials:"same-origin",redirect:"error"}));
    expect(mocks.faceCreate).toHaveBeenCalledWith({},expect.objectContaining({runningMode:"VIDEO",numFaces:3,outputFaceBlendshapes:false}));
    expect(onFrame).toHaveBeenCalledWith(expect.objectContaining({timeSeconds:0,face:expect.objectContaining({status:"no_face"}),pose:expect.objectContaining({status:"no_person"})}));
    await vi.advanceTimersByTimeAsync(140);tick(.14);
    expect(face.detectForVideo).toHaveBeenCalledTimes(2);
    const first=face.detectForVideo.mock.calls[0] as unknown as [unknown,number];
    const second=face.detectForVideo.mock.calls[1] as unknown as [unknown,number];
    expect(second[1]).toBeGreaterThan(first[1]);
    stop();expect(face.close).toHaveBeenCalledTimes(1);expect(pose.close).toHaveBeenCalledTimes(1);
  });
  it("clears on seek, resets temporal graphs, and supports backwards seek timestamps", async () => {
    const face=detector("face"),pose=detector("pose");mocks.faceCreate.mockResolvedValue(face);mocks.poseCreate.mockResolvedValue(pose);
    const {video,tick}=videoFixture();video.currentTime=20;const onFrame=vi.fn();
    const stop=await startReplayObservations(video,{signal:new AbortController().signal,onFrame,onStatus:vi.fn()});
    video.dispatchEvent(new Event("seeking"));expect(onFrame).toHaveBeenLastCalledWith(null);
    video.currentTime=2;video.dispatchEvent(new Event("seeked"));await flush();
    expect(face.setOptions).toHaveBeenNthCalledWith(1,{runningMode:"IMAGE"});
    expect(face.setOptions).toHaveBeenNthCalledWith(2,{runningMode:"VIDEO"});
    expect(onFrame).toHaveBeenLastCalledWith(expect.objectContaining({timeSeconds:2}));
    await vi.advanceTimersByTimeAsync(150);tick(2.15);
    const stamps=face.detectForVideo.mock.calls.map(call=>(call as unknown as [unknown,number])[1]);
    expect(stamps.every((stamp,i)=>i===0||stamp>stamps[i-1])).toBe(true);stop();
  });
  it("never emits results after abort and disposes engines exactly once", async () => {
    const face=detector("face"),pose=detector("pose");mocks.faceCreate.mockResolvedValue(face);mocks.poseCreate.mockResolvedValue(pose);
    const {video,tick}=videoFixture();const controller=new AbortController();const onFrame=vi.fn();
    const stop=await startReplayObservations(video,{signal:controller.signal,onFrame,onStatus:vi.fn()});
    controller.abort();const count=onFrame.mock.calls.length;await vi.advanceTimersByTimeAsync(200);tick(.2);
    expect(onFrame).toHaveBeenCalledTimes(count);expect(onFrame).toHaveBeenLastCalledWith(null);stop();
    expect(face.close).toHaveBeenCalledTimes(1);expect(pose.close).toHaveBeenCalledTimes(1);expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(42);
  });
  it("falls back explicitly to face-only when pose asset is absent", async () => {
    const face=detector("face");mocks.faceCreate.mockResolvedValue(face);mocks.poseCreate.mockRejectedValue(new Error("unavailable"));
    const {video}=videoFixture();const onStatus=vi.fn();const onFrame=vi.fn();
    const stop=await startReplayObservations(video,{signal:new AbortController().signal,onFrame,onStatus});
    expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({state:"ready",poseAvailable:false,message:expect.stringContaining("얼굴만")}));
    expect(onFrame).toHaveBeenCalledWith(expect.objectContaining({pose:expect.objectContaining({status:"unavailable"})}));stop();
  });
  it("disposes a model which finishes initialization after cancellation", async () => {
    const face=detector("face");let finish:(instance:typeof face)=>void=()=>undefined;
    mocks.faceCreate.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    const {video}=videoFixture();const controller=new AbortController();
    const pending=startReplayObservations(video,{signal:controller.signal,onFrame:vi.fn(),onStatus:vi.fn()});
    const rejection=expect(pending).rejects.toMatchObject({name:"AbortError"});
    await vi.waitFor(()=>expect(mocks.faceCreate).toHaveBeenCalledTimes(1));
    controller.abort();await rejection;finish(face);await flush();expect(face.close).toHaveBeenCalledTimes(1);
  });
  it("stops and clears on source emptied, without retaining an old video overlay", async () => {
    const face=detector("face");mocks.faceCreate.mockResolvedValue(face);
    const {video,tick}=videoFixture();const onFrame=vi.fn();
    await startReplayObservations(video,{signal:new AbortController().signal,onFrame,onStatus:vi.fn(),includePose:false});
    video.dispatchEvent(new Event("emptied"));expect(onFrame).toHaveBeenLastCalledWith(null);
    await vi.advanceTimersByTimeAsync(200);tick(.2);expect(face.detectForVideo).toHaveBeenCalledTimes(1);expect(face.close).toHaveBeenCalledTimes(1);
  });
  it("clears at ended and does not infer a final frame after playback completes", async () => {
    const face=detector("face");mocks.faceCreate.mockResolvedValue(face);
    const {video,tick}=videoFixture();const onFrame=vi.fn();
    const stop=await startReplayObservations(video,{signal:new AbortController().signal,onFrame,onStatus:vi.fn(),includePose:false});
    Object.defineProperty(video,"ended",{value:true,configurable:true});video.dispatchEvent(new Event("ended"));
    expect(onFrame).toHaveBeenLastCalledWith(null);await vi.advanceTimersByTimeAsync(200);tick(.2);expect(face.detectForVideo).toHaveBeenCalledTimes(1);stop();
  });
  it("discards a slow inference instead of drawing stale coordinates on later footage", async () => {
    const face=detector("face");face.detectForVideo.mockImplementation(()=>{vi.advanceTimersByTime(300);return {faceLandmarks:[]};});mocks.faceCreate.mockResolvedValue(face);
    const {video}=videoFixture();const onFrame=vi.fn();
    const stop=await startReplayObservations(video,{signal:new AbortController().signal,onFrame,onStatus:vi.fn(),includePose:false});
    expect(onFrame).toHaveBeenLastCalledWith(null);
    expect(onFrame.mock.calls.every(call=>call[0]===null)).toBe(true);stop();
  });
  it("reports an inference error and releases the engine rather than leaving the last overlay", async () => {
    const face=detector("face");face.detectForVideo.mockImplementation(()=>{throw new Error("프레임 해독 오류");});mocks.faceCreate.mockResolvedValue(face);
    const {video}=videoFixture();const onFrame=vi.fn();const onStatus=vi.fn();
    await startReplayObservations(video,{signal:new AbortController().signal,onFrame,onStatus,includePose:false});
    expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({state:"error",message:"프레임 해독 오류"}));
    expect(onFrame).toHaveBeenLastCalledWith(null);expect(face.close).toHaveBeenCalledTimes(1);
  });
});
