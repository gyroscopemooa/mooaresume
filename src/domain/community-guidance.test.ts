import { describe, expect, it } from "vitest";
import { communityGuidance } from "./community-guidance";
describe("relevant public next steps", () => {
  it("connects application questions to actual guides/examples", () => {
    expect(communityGuidance("application").map((item) => item.href)).toEqual(["/guide", "/examples"]);
  });
  it("offers career exploration without forcing sales links into unrelated topics", () => {
    expect(communityGuidance("career")[0].href).toBe("/career");
    expect(communityGuidance("work-life")).toEqual([]);
    expect(communityGuidance("job-search")).toEqual([]);
  });
});
