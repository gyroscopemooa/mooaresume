import { describe, expect, it } from "vitest";
import { getRecurringPriceDeadline } from "./recurring-price-deadline";

describe("getRecurringPriceDeadline", () => {
  it.each([
    ["2026-10-14T15:00:00.000Z", "10월 15일까지"],
    ["2026-10-15T15:00:00.000Z", "10월 30일까지"],
    ["2026-10-29T15:00:00.000Z", "10월 30일까지"],
    ["2026-10-30T15:00:00.000Z", "11월 15일까지"],
    ["2026-12-30T15:00:00.000Z", "1월 15일까지"],
  ])("uses the next Seoul-time 15th or 30th for %s", (iso, expected) => {
    expect(getRecurringPriceDeadline(new Date(iso))).toBe(expected);
  });
});
