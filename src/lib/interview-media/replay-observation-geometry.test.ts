import { describe, expect, it } from "vitest";
import { createReplayObservation, isReplayObservationFresh, measureReplayFace, measureReplayPose, REPLAY_POSE_CONNECTIONS, type PosePoint } from "./replay-observation-geometry";
import { createVisionFrame, type VisionLandmark } from "./vision-geometry";

function face(): VisionLandmark[] {
  const points = Array.from({ length: 478 }, () => ({ x: .5, y: .5, z: 0 }));
  for (const [i, x, y] of [[33,.3,.35], [133,.4,.35], [263,.7,.35], [362,.6,.35], [152,.5,.85], [159,.35,.34], [145,.35,.36], [386,.65,.34], [374,.65,.36], [468,.35,.35], [473,.65,.35], [61,.4,.6], [291,.6,.6], [13,.5,.59], [14,.5,.61]]) points[i] = { x, y, z: 0 };
  return points;
}
function body(): PosePoint[] {
  const points = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: .9 }));
  points[11] = { x: .3, y: .3, z: 0, visibility: .9 };
  points[12] = { x: .7, y: .3, z: 0, visibility: .9 };
  points[23] = { x: .4, y: .6, z: 0, visibility: .9 };
  points[24] = { x: .6, y: .6, z: 0, visibility: .9 };
  return points;
}
describe("replay observations are geometric, not assessments", () => {
  it("measures eyelid and lip aperture in actual image aspect ratio", () => {
    const observation = createVisionFrame(0, [face()], 1000, 500);
    const result = measureReplayFace(observation, 1000, 500);
    expect(result.eyeOpeningRatio).toBeCloseTo(.1);
    expect(result.mouthOpeningRatio).toBeCloseTo(.05);
    expect(result.irisHorizontalRatio).toBeCloseTo(.5);
    expect(result).not.toHaveProperty("emotion");
    expect(result).not.toHaveProperty("gazeScore");
  });
  it("does not estimate iris position through closed eyes or missing iris points", () => {
    const closed = face(); closed[159].y = closed[145].y; closed[386].y = closed[374].y;
    expect(measureReplayFace(createVisionFrame(0, [closed], 1000, 500), 1000, 500).irisHorizontalRatio).toBeNull();
    expect(measureReplayFace(createVisionFrame(0, [face().slice(0,468)], 1000, 500), 1000, 500).irisHorizontalRatio).toBeNull();
  });
  it("uses image-left-to-right iris projection instead of naming a gaze direction", () => {
    const points = face(); points[468].x = .375; points[473].x = .675;
    expect(measureReplayFace(createVisionFrame(0, [points], 1000, 1000), 1000, 1000).irisHorizontalRatio).toBeCloseTo(.75);
  });
  it("returns no face measurements for invalid, missing, or multiple faces", () => {
    for (const faces of [[], [face(),face()], [face().slice(0,10)]]) {
      expect(measureReplayFace(createVisionFrame(0, faces, 1000, 1000), 1000, 1000)).toEqual({ eyeOpeningRatio:null, irisHorizontalRatio:null, mouthOpeningRatio:null });
    }
  });
  it("measures projected shoulder and torso lines without posture scores", () => {
    const result = measureReplayPose([body()], 1000, 500);
    expect(result.shoulderTiltDegrees).toBeCloseTo(0);
    expect(result.torsoTiltDegrees).toBeCloseTo(0);
    expect(result).not.toHaveProperty("score");
    const angled = body(); angled[12].y = .5;
    expect(measureReplayPose([angled], 1000, 500).shoulderTiltDegrees).toBeCloseTo(Math.atan2(100,400)*180/Math.PI);
  });
  it("omits low visibility, absent, nonfinite, and offscreen joints", () => {
    for (const point of [ { ...body()[11], visibility:.64 }, { ...body()[11], presence:.5 }, { ...body()[11], visibility:NaN }, { ...body()[11], x:1.02 }, { x:.3,y:.3,z:0 } ]) {
      const points = body(); points[11] = point;
      const result = measureReplayPose([points],1000,500);
      expect(result.landmarks[11]).toBeNull();
      expect(result.shoulderTiltDegrees).toBeNull();
      expect(result.torsoTiltDegrees).toBeNull();
    }
  });
  it("does not invent hidden hips for an upper-body recording", () => {
    const points = body(); points[23].visibility = .1; points[24].visibility = .1;
    const result = measureReplayPose([points], 1000, 500);
    expect(result.shoulderTiltDegrees).toBe(0);
    expect(result.torsoTiltDegrees).toBeNull();
  });
  it("does not silently select a body in multiple-person footage", () => {
    expect(measureReplayPose([body(),body()],1000,500)).toEqual({ status:"multiple_people",landmarks:[],shoulderTiltDegrees:null,torsoTiltDegrees:null });
    expect(createReplayObservation(0,0,[face(),face()],[body()],1000,500).pose.status).toBe("multiple_people");
  });
  it("distinguishes absent body from unavailable model", () => {
    expect(measureReplayPose(null,1000,500).status).toBe("unavailable");
    expect(measureReplayPose([],1000,500).status).toBe("no_person");
    expect(measureReplayPose([body().slice(0,10)],1000,500).status).toBe("unavailable");
    expect(REPLAY_POSE_CONNECTIONS.every(([a,b]) => a>=11&&b>=11&&a<33&&b<33)).toBe(true);
  });
});

describe("replay frame freshness", () => {
  const observation = createReplayObservation(3,1000,[face()],[body()],1000,500);
  it("permits a short measured lag but never synthesizes interpolation", () => {
    expect(isReplayObservationFresh(observation,3.1,1100,1,false,false,false)).toBe(true);
    expect(isReplayObservationFresh(observation,3.3,1200,1,false,false,false)).toBe(false);
    expect(isReplayObservationFresh(observation,3.1,1400,1,false,false,false)).toBe(false);
    expect(isReplayObservationFresh(observation,3.25,1150,1.5,false,false,false)).toBe(true);
  });
  it("removes measurements immediately during seeking, after ended, or for a new timeline", () => {
    expect(isReplayObservationFresh(observation,3,1000,1,false,true,false)).toBe(false);
    expect(isReplayObservationFresh(observation,3,1000,1,false,false,true)).toBe(false);
    expect(isReplayObservationFresh(observation,1,1000,1,true,false,false)).toBe(false);
    expect(isReplayObservationFresh(null,3,1000,1,false,false,false)).toBe(false);
  });
  it("retains a paused exact frame but rejects invalid clocks and rates", () => {
    expect(isReplayObservationFresh(observation,3,999999,1,true,false,false)).toBe(true);
    expect(isReplayObservationFresh(observation,3.1,1100,1,true,false,false)).toBe(false);
    expect(isReplayObservationFresh(observation,NaN,1000,1,true,false,false)).toBe(false);
    expect(isReplayObservationFresh(observation,3,900,1,false,false,false)).toBe(false);
    expect(isReplayObservationFresh(observation,3,1000,0,false,false,false)).toBe(false);
  });
});
