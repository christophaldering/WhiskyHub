import { describe, it, expect, vi, beforeEach } from "vitest";
import { getM2Fallback } from "@/components/m2/M2BackButton";

describe("M2BackButton — getM2Fallback", () => {
  it("returns /m2/tastings for tasting subroutes", () => {
    expect(getM2Fallback("/m2/tastings/join")).toBe("/m2/tastings");
    expect(getM2Fallback("/m2/tastings/session/123")).toBe("/m2/tastings");
    expect(getM2Fallback("/m2/tastings/session/123/host")).toBe("/m2/tastings");
  });

  it("returns /m2/taste for taste subroutes", () => {
    expect(getM2Fallback("/m2/taste/profile")).toBe("/m2/taste");
    expect(getM2Fallback("/m2/taste")).toBe("/m2/taste");
  });

  it("returns /m2/circle for circle subroutes", () => {
    expect(getM2Fallback("/m2/circle/rankings")).toBe("/m2/circle");
  });

  it("returns /m2/tastings as default fallback", () => {
    expect(getM2Fallback("/m2")).toBe("/m2/tastings");
    expect(getM2Fallback("/some/other/path")).toBe("/m2/tastings");
  });
});
