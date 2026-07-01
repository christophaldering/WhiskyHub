import { describe, it, expect } from "vitest";
import {
  clampScore0to100,
  normalizePersonalScore,
  computeStabilityScore,
  STABILITY_MAX_STDDEV,
} from "../../server/participant-scores";

describe("clampScore0to100", () => {
  it("returns 0 for NaN (non-finite)", () => {
    expect(clampScore0to100(Number.NaN)).toBe(0);
  });

  it("returns 0 for Infinity (non-finite)", () => {
    expect(clampScore0to100(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampScore0to100(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it("clamps values below 0 to 0", () => {
    expect(clampScore0to100(-5)).toBe(0);
  });

  it("keeps the lower boundary 0 unchanged", () => {
    expect(clampScore0to100(0)).toBe(0);
  });

  it("passes through in-range values unchanged", () => {
    expect(clampScore0to100(50)).toBe(50);
  });

  it("keeps the upper boundary 100 unchanged", () => {
    expect(clampScore0to100(100)).toBe(100);
  });

  it("clamps values above 100 to 100", () => {
    expect(clampScore0to100(150)).toBe(100);
  });
});

describe("normalizePersonalScore", () => {
  it("returns 0 for NaN (non-finite)", () => {
    expect(normalizePersonalScore(Number.NaN)).toBe(0);
  });

  it("maps 0 to 0", () => {
    expect(normalizePersonalScore(0)).toBe(0);
  });

  it("scales a 10-scale value by 10 (5 -> 50)", () => {
    expect(normalizePersonalScore(5)).toBe(50);
  });

  it("treats exactly 10 as a 10-scale value (x10 threshold is inclusive): 10 -> 100", () => {
    expect(normalizePersonalScore(10)).toBe(100);
  });

  it("treats values just above 10 as already-100-scale and leaves them raw: 10.0001 -> 10.0001", () => {
    expect(normalizePersonalScore(10.0001)).toBe(10.0001);
  });

  it("leaves 10.5 as a raw 100-scale value (>10 branch): 10.5 -> 10.5", () => {
    expect(normalizePersonalScore(10.5)).toBe(10.5);
  });

  it("passes through a mid 100-scale value unchanged: 55 -> 55", () => {
    expect(normalizePersonalScore(55)).toBe(55);
  });

  it("keeps the upper boundary 100 unchanged", () => {
    expect(normalizePersonalScore(100)).toBe(100);
  });

  it("clamps a raw value above 100 down to 100: 150 -> 100", () => {
    expect(normalizePersonalScore(150)).toBe(100);
  });
});

describe("computeStabilityScore", () => {
  it("returns null for an empty array (fewer than 3 values)", () => {
    expect(computeStabilityScore([])).toBeNull();
  });

  it("returns null for a single value (fewer than 3 values)", () => {
    expect(computeStabilityScore([50])).toBeNull();
  });

  it("returns null for two values (fewer than 3 values)", () => {
    expect(computeStabilityScore([50, 50])).toBeNull();
  });

  it("returns the maximum 10 for identical values (stdDev 0)", () => {
    expect(computeStabilityScore([50, 50, 50])).toBe(10);
  });

  it("returns a mid value for moderately scattered scores ([40,50,60] -> 7.3)", () => {
    expect(computeStabilityScore([40, 50, 60])).toBe(7.3);
  });

  it("returns 0 when stdDev equals STABILITY_MAX_STDDEV ([0,60,0,60] -> stdDev 30 -> 0)", () => {
    expect(computeStabilityScore([0, 60, 0, 60])).toBe(0);
  });

  it("clamps to 0 for strongly scattered scores (stdDev > STABILITY_MAX_STDDEV)", () => {
    expect(computeStabilityScore([0, 0, 0, 100, 100, 100])).toBe(0);
  });

  it("uses STABILITY_MAX_STDDEV = 30 as the zero-stability threshold", () => {
    expect(STABILITY_MAX_STDDEV).toBe(30);
  });
});
