import { describe, expect, it } from "vitest";
import { parseAppearanceVlmOutput } from "./appearance-vlm";

describe("appearance VLM output parser", () => {
  it("accepts only the bounded observation vocabulary", () => {
    expect(parseAppearanceVlmOutput("HAIR_EYES=yes; COLLAR=orderly; FACE_OCCLUSION=no; IMAGE_QUALITY=usable; EVIDENCE=hair crosses the left eye")).toEqual({ hairEyes: "yes", collar: "orderly", faceOcclusion: "no", imageQuality: "usable", evidence: "hair crosses the left eye" });
  });
  it("holds malformed or invented labels instead of turning them into feedback", () => {
    expect(parseAppearanceVlmOutput("HAIR_EYES=beautiful; COLLAR=smart; EVIDENCE=")).toEqual({ hairEyes: "uncertain", collar: "uncertain", faceOcclusion: "uncertain", imageQuality: "uncertain", evidence: "HAIR_EYES=beautiful; COLLAR=smart; EVIDENCE=" });
  });
  it("does not parse allowed options echoed inside an unanswered prompt", () => {
    const echoed = "User: Reply HAIR_EYES=yes|no|uncertain; COLLAR=orderly|disordered|uncertain; FACE_OCCLUSION=yes|no|uncertain; IMAGE_QUALITY=usable|poor|uncertain; EVIDENCE=literal.\nAssistant:";
    expect(parseAppearanceVlmOutput(echoed)).toMatchObject({ hairEyes: "uncertain", collar: "uncertain", faceOcclusion: "uncertain", imageQuality: "uncertain" });
  });
});
