// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeHeaderWordmark } from "./home-header-wordmark";

describe("HomeHeaderWordmark", () => {
  it("keeps the Korean and English brand names available in one home link", () => {
    render(<HomeHeaderWordmark />);

    const homeLink = screen.getByRole("link", { name: "무아레쥬메 (MOOA Resume) 홈" });
    expect(homeLink.getAttribute("href")).toBe("/");
    expect(homeLink.textContent).toContain("무아레쥬메");
    expect(homeLink.textContent).toContain("MOOA RESUME");
  });
});
