import { describe, it, expect } from "vitest";
import {
  normalizeText,
  normalizeKey,
  parseAge,
  parseAbv,
  parsePrice,
  parseSmoky,
} from "../../server/historical-import";

describe("normalizeText", () => {
  it("returns null for null/empty input", () => {
    expect(normalizeText(null)).toBeNull();
    expect(normalizeText("")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(normalizeText("  hello  ")).toBe("hello");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeText("hello   world")).toBe("hello world");
  });

  it("normalizes tabs and newlines to single space", () => {
    expect(normalizeText("hello\t\nworld")).toBe("hello world");
  });
});

describe("normalizeKey", () => {
  it("returns empty string for null/empty", () => {
    expect(normalizeKey(null)).toBe("");
    expect(normalizeKey("")).toBe("");
  });

  it("lowercases and replaces non-alphanumeric with dashes", () => {
    expect(normalizeKey("Lagavulin 16")).toBe("lagavulin-16");
  });

  it("collapses multiple dashes", () => {
    expect(normalizeKey("Ardbeg -- Uigeadail")).toBe("ardbeg-uigeadail");
  });

  it("strips leading/trailing dashes", () => {
    expect(normalizeKey("--hello--")).toBe("hello");
  });

  it("handles special characters", () => {
    expect(normalizeKey("Glenfiddich (18yr)")).toBe("glenfiddich-18yr");
  });
});

describe("parseAge", () => {
  it("returns null for null/empty", () => {
    expect(parseAge(null)).toBeNull();
    expect(parseAge("")).toBeNull();
  });

  it("extracts numeric age", () => {
    expect(parseAge("12")).toBe(12);
    expect(parseAge("18 Jahre")).toBe(18);
    expect(parseAge("NAS")).toBeNull();
  });

  it("handles leading text", () => {
    expect(parseAge("ca. 25")).toBe(25);
  });
});

describe("parseAbv", () => {
  it("returns null for null", () => {
    expect(parseAbv(null)).toBeNull();
  });

  it("parses numeric input directly", () => {
    expect(parseAbv(46)).toBe(46);
  });

  it("converts decimal fraction (0-1) to percentage", () => {
    expect(parseAbv(0.465)).toBe(46.5);
  });

  it("parses string with percent sign", () => {
    expect(parseAbv("46.5%")).toBe(46.5);
  });

  it("parses string with comma decimal", () => {
    expect(parseAbv("46,5")).toBe(46.5);
  });

  it("returns null for non-numeric string", () => {
    expect(parseAbv("n/a")).toBeNull();
  });

  it("handles 0 as valid value", () => {
    expect(parseAbv(0)).toBe(0);
  });
});

describe("parsePrice", () => {
  it("returns null for null", () => {
    expect(parsePrice(null)).toBeNull();
  });

  it("returns numeric input directly", () => {
    expect(parsePrice(59.90)).toBe(59.90);
  });

  it("parses string with currency symbol", () => {
    expect(parsePrice("€59.90")).toBe(59.90);
    expect(parsePrice("$100")).toBe(100);
    expect(parsePrice("£75.50")).toBe(75.50);
  });

  it("parses comma decimal", () => {
    expect(parsePrice("59,90")).toBe(59.90);
  });

  it("returns null for non-numeric", () => {
    expect(parsePrice("free")).toBeNull();
  });
});

describe("parseSmoky", () => {
  it("returns null for null/empty", () => {
    expect(parseSmoky(null)).toBeNull();
    expect(parseSmoky("")).toBeNull();
  });

  it("returns true for yes variants", () => {
    expect(parseSmoky("Ja")).toBe(true);
    expect(parseSmoky("yes")).toBe(true);
    expect(parseSmoky("j")).toBe(true);
    expect(parseSmoky("JA")).toBe(true);
  });

  it("returns false for no variants", () => {
    expect(parseSmoky("Nein")).toBe(false);
    expect(parseSmoky("no")).toBe(false);
    expect(parseSmoky("n")).toBe(false);
    expect(parseSmoky("NEIN")).toBe(false);
  });

  it("returns null for unrecognized", () => {
    expect(parseSmoky("maybe")).toBeNull();
    expect(parseSmoky("leicht")).toBeNull();
  });
});

describe("deterministic source key generation", () => {
  it("generates consistent tasting source keys", () => {
    const tastingNumber = 15;
    const sourceKey = `hist-tasting-${tastingNumber}`;
    expect(sourceKey).toBe("hist-tasting-15");
    expect(`hist-tasting-${tastingNumber}`).toBe(sourceKey);
  });

  it("generates consistent whisky source keys", () => {
    const tastingNumber = 5;
    const distKey = normalizeKey("Lagavulin");
    const whiskyKey = normalizeKey("16 Years Old");
    const key = `hist-${tastingNumber}-${distKey}-${whiskyKey}`;
    expect(key).toBe("hist-5-lagavulin-16-years-old");

    const key2 = `hist-${tastingNumber}-${normalizeKey("Lagavulin")}-${normalizeKey("16 Years Old")}`;
    expect(key2).toBe(key);
  });

  it("handles null distillery/whisky in key", () => {
    const key = `hist-1-${normalizeKey(null)}-${normalizeKey(null)}`;
    expect(key).toBe("hist-1--");
  });

  it("produces different keys for different inputs", () => {
    const key1 = `hist-1-${normalizeKey("Lagavulin")}-${normalizeKey("16")}`;
    const key2 = `hist-1-${normalizeKey("Ardbeg")}-${normalizeKey("10")}`;
    expect(key1).not.toBe(key2);
  });
});
