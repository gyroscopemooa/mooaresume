import { describe, expect, it } from "vitest";
import { productExampleSchema } from "@/domain/example";
import { productExamples } from "./product-examples";

describe("productExamples", () => {
  it("keeps every public example inside the typed contract", () => {
    for (const example of productExamples) expect(productExampleSchema.safeParse(example).success).toBe(true);
  });

  it("does not assign a readiness score before a draft exists", () => {
    expect(productExamples.find((example) => example.mode === "CREATE")?.readiness).toBeNull();
  });
});
