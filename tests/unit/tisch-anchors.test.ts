import { describe, it, expect } from "vitest";
import { TISCH_ANCHORS, anchorToScale, nearestAnchorIndex } from "../../client/src/labs/components/rating/tischAnchors";

describe("tischAnchors", () => {
  it("hat sechs Anker in absteigender Reihenfolge (beste Stufe zuerst)", () => {
    expect(TISCH_ANCHORS).toHaveLength(6);
    for (let i = 1; i < TISCH_ANCHORS.length; i++) {
      expect(TISCH_ANCHORS[i].value100).toBeLessThan(TISCH_ANCHORS[i - 1].value100);
    }
    expect(TISCH_ANCHORS[0]).toEqual({ bandKey: "band90", value100: 92 });
    expect(TISCH_ANCHORS[5]).toEqual({ bandKey: "band0", value100: 65 });
  });

  it("ist auf der 100er-Skala identisch", () => {
    for (const a of TISCH_ANCHORS) {
      expect(anchorToScale(a.value100, 100, 0.5)).toBe(a.value100);
    }
  });

  it("konvertiert korrekt auf die 20er-Skala (Schritt 0.5)", () => {
    expect(anchorToScale(92, 20, 0.5)).toBe(18.5);
    expect(anchorToScale(77, 20, 0.5)).toBe(15.5);
    expect(anchorToScale(65, 20, 0.5)).toBe(13);
  });

  it("konvertiert korrekt auf die 10er-Skala (Schritt 0.5)", () => {
    expect(anchorToScale(92, 10, 0.5)).toBe(9);
    expect(anchorToScale(65, 10, 0.5)).toBe(6.5);
  });

  it("bleibt auf jeder Skala monoton (keine Rangvertauschung)", () => {
    for (const [max, step] of [[100, 0.5], [20, 0.5], [10, 0.5], [5, 0.5]] as const) {
      const vals = TISCH_ANCHORS.map((a) => anchorToScale(a.value100, max, step));
      for (let i = 1; i < vals.length; i++) {
        expect(vals[i]).toBeLessThanOrEqual(vals[i - 1]);
      }
      expect(vals.every((v) => v >= step && v <= max)).toBe(true);
    }
  });

  it("findet beim Re-Rating den nächstliegenden Anker (Roundtrip auf 100er-Skala)", () => {
    TISCH_ANCHORS.forEach((a, i) => {
      expect(nearestAnchorIndex(a.value100, 100, 0.5)).toBe(i);
    });
    expect(nearestAnchorIndex(90, 100, 0.5)).toBe(0); // 90 liegt näher an 92 als an 87
    expect(nearestAnchorIndex(50, 100, 0.5)).toBe(5); // alles Niedrige fällt auf band0
  });
});
