import { describe, expect, it } from "vitest";
import { getCheckoutReturnOrigin } from "./checkout-return-origin";

describe("checkout return origin", () => {
  it("returns customers to the deployment that initiated checkout", () => {
    expect(
      getCheckoutReturnOrigin(
        new URL("https://dev.mooaresume.com/api/checkouts/pro"),
      ),
    ).toBe("https://dev.mooaresume.com");
  });

  it("keeps localhost checkouts on localhost", () => {
    expect(
      getCheckoutReturnOrigin(
        new URL("http://localhost:3000/api/checkouts/quick"),
      ),
    ).toBe("http://localhost:3000");
  });

  it("rejects non-web protocols", () => {
    expect(() =>
      getCheckoutReturnOrigin(new URL("file:///api/checkouts/pro")),
    ).toThrow("CHECKOUT_RETURN_PROTOCOL_NOT_ALLOWED");
  });
});
