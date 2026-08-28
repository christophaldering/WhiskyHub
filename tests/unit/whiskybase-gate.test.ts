import { describe, it, expect } from "vitest";
import {
  checkMatch,
  canonicalBottler,
  sameBottler,
  parseAbv,
  parseAge,
  parseYear,
  ABV_TOLERANCE,
  DEFAULT_SIZE_ML,
  type WbLookupItem,
} from "../../server/whiskybase-unified";

// Die Faelle stammen aus dem WB-ID-Befund vom 10.08.2026: acht Abweichungen
// aus einem Lineup von 31 Abfuellungen. Drei davon muss allein das Gate
// abfangen, ohne jede Zusatzabfrage.

const src = (o: Partial<WbLookupItem>): WbLookupItem => ({ name: "Testflasche", ...o });

describe("checkMatch — reale Fehlerfaelle", () => {
  it("Old Friends Caol Ila: 57,1 % gesucht, 43,0 % gefunden -> abgelehnt", () => {
    const reason = checkMatch(src({ abv: "57.1" }), { abv: "43.0" });
    expect(reason).not.toBeNull();
    expect(reason).toContain("ABV");
  });

  it("Bunnahabhain: 68,8 gegen 67,0 -> abgelehnt, auch bei kleiner Differenz", () => {
    expect(checkMatch(src({ abv: "68.8" }), { abv: "67.0" })).not.toBeNull();
  });

  it("Ledaig: 200-ml-Miniatur auf eine 0,7-l-Suche -> abgelehnt", () => {
    const reason = checkMatch(src({ name: "Ledaig 24" }), { sizeMl: 200 });
    expect(reason).not.toBeNull();
    expect(reason).toContain("200 ml");
  });

  it("Bowmore: Jahrgang 2020 gesucht, 2000 gefunden -> abgelehnt", () => {
    const reason = checkMatch(src({ distilledYear: "2020" }), { distilledYear: "2000" });
    expect(reason).toContain("Destillationsjahr");
  });

  it("Caol Ila 14 gegen 12 Jahre -> abgelehnt", () => {
    expect(checkMatch(src({ age: "14" }), { age: "12" })).toContain("Alter");
  });
});

describe("checkMatch — was durchgehen muss", () => {
  it("identische Werte passieren", () => {
    expect(checkMatch(src({ abv: "57.1", age: "14", bottledYear: "2021" }), {
      abv: "57.1", age: "14", bottledYear: "2021", sizeMl: 700,
    })).toBeNull();
  });

  it("Abweichung innerhalb der Toleranz passiert", () => {
    expect(checkMatch(src({ abv: "57.1" }), { abv: "57.15" })).toBeNull();
    expect(ABV_TOLERANCE).toBe(0.1);
  });

  it("fehlende Merkmale sind kein Widerspruch — sonst faellt gerade die duenn beschriftete Einzelfassabfuellung durch", () => {
    expect(checkMatch(src({}), {})).toBeNull();
    expect(checkMatch(src({ abv: "57.1" }), {})).toBeNull();
    expect(checkMatch(src({}), { abv: "43.0" })).toBeNull();
  });

  it("unbekannte Gebindegroesse gilt als 0,7 l und wird nicht bemaengelt", () => {
    expect(checkMatch(src({}), { sizeMl: 700 })).toBeNull();
    expect(checkMatch(src({}), { sizeMl: null })).toBeNull();
    expect(DEFAULT_SIZE_ML).toBe(700);
  });

  it("ausdruecklich gesuchte 200-ml-Probe akzeptiert den 200-ml-Treffer", () => {
    expect(checkMatch(src({ sizeMl: 200 }), { sizeMl: 200 })).toBeNull();
  });

  it("Formatunterschiede sind keine Abweichung", () => {
    expect(checkMatch(src({ abv: "57,1 %" }), { abv: "57.1" })).toBeNull();
    expect(checkMatch(src({ age: "14 Jahre" }), { age: "14" })).toBeNull();
    expect(checkMatch(src({ bottledYear: "15.03.2021" }), { bottledYear: "2021" })).toBeNull();
  });

  it("NAS gegen Altersangabe ist eine Abweichung, NAS gegen NAS nicht", () => {
    expect(checkMatch(src({ age: "NAS" }), { age: "12" })).not.toBeNull();
    expect(checkMatch(src({ age: "NAS" }), { age: "NAS" })).toBeNull();
  });
});

describe("Abfueller-Aliase", () => {
  it("erkennt die bekannte Namensdrift als denselben Abfueller", () => {
    expect(sameBottler("van Wees", "The Ultimate Whisky Company")).toBe(true);
    expect(sameBottler("The Cask Hound", "The Caskhound")).toBe(true);
    expect(sameBottler("The Cask Hound", "Exquisite Casks")).toBe(true);
    expect(sameBottler("Anam na h-Alba", "ANHA")).toBe(true);
    expect(sameBottler("Duncan Taylor", "Battlehill")).toBe(true);
  });

  it("trennt tatsaechlich verschiedene Abfueller", () => {
    expect(sameBottler("van Wees", "Signatory Vintage")).toBe(false);
    expect(checkMatch(src({ bottler: "van Wees" }), { bottler: "Signatory Vintage" }))
      .toContain("Abfueller");
  });

  it("ein unbekannter Abfueller blockiert nichts", () => {
    expect(sameBottler("van Wees", null)).toBe(true);
    expect(sameBottler(null, "irgendwer")).toBe(true);
  });

  it("kanonisiert auf eine gemeinsame Form", () => {
    expect(canonicalBottler("The Ultimate")).toBe(canonicalBottler("van Wees"));
  });
});

describe("Wert-Erkennung", () => {
  it("parseAbv", () => {
    expect(parseAbv("57.1")).toBe(57.1);
    expect(parseAbv("57,1 %")).toBe(57.1);
    expect(parseAbv(46)).toBe(46);
    expect(parseAbv("cask strength")).toBeNull();
    expect(parseAbv(null)).toBeNull();
  });

  it("parseAge", () => {
    expect(parseAge("14")).toBe(14);
    expect(parseAge("14 Jahre")).toBe(14);
    expect(parseAge("NAS")).toBe("NAS");
    expect(parseAge("No Age Statement")).toBe("NAS");
    expect(parseAge("")).toBeNull();
  });

  it("parseYear", () => {
    expect(parseYear("2007")).toBe(2007);
    expect(parseYear("15.03.2007")).toBe(2007);
    expect(parseYear("2007-03-15")).toBe(2007);
    expect(parseYear("keine Angabe")).toBeNull();
  });
});

describe("Glenturret-Fall: gleiche Merkmale, verschiedene Faesser", () => {
  // Destillerie, Abfueller, ABV, Fasstyp und beide Daten identisch — aus den
  // Lineup-Daten allein nicht entscheidbar. Das Gate laesst beide Kandidaten
  // durch; die Trennung muss die Uneindeutigkeits-Meldung leisten, nicht eine
  // Regel nach Bekanntheit.
  const glenturret = src({
    name: "Glenturret 2010", distillery: "Glenturret",
    abv: "55.4", age: "12", bottledYear: "2023", distilledYear: "2010",
  });

  it("beide Kandidaten bestehen das Gate — es gibt kein trennendes Merkmal", () => {
    const a = { abv: "55.4", age: "12", bottledYear: "2023", distilledYear: "2010" };
    const b = { abv: "55.4", age: "12", bottledYear: "2023", distilledYear: "2010" };
    expect(checkMatch(glenturret, a)).toBeNull();
    expect(checkMatch(glenturret, b)).toBeNull();
  });

  it("unterscheidbare Faesser trennt das Gate sehr wohl", () => {
    expect(checkMatch(glenturret, { abv: "55.4", age: "12", bottledYear: "2024" }))
      .toContain("Abfuelljahr");
  });
});