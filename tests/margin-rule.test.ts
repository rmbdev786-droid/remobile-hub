import { describe, expect, it } from "vitest";
import { marginFractionToPercent, marginPercentToFractionString } from "../lib/pricing/margin-rule";

describe("margin rule percentage normalization", () => {
  it("displays a stored 0.2500 fraction as 25 percent", () => {
    expect(marginFractionToPercent("0.2500")).toBe("25");
  });

  it("preserves a 25 percent margin when a rounding-only edit is saved", () => {
    const displayedMargin = Number(marginFractionToPercent("0.2500"));
    expect(marginPercentToFractionString(displayedMargin)).toBe("0.2500");
  });
});
