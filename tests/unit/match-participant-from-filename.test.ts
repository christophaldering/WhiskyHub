import { describe, expect, it } from "vitest";
import {
  matchParticipantFromFilename,
  type ParticipantLike,
} from "../../client/src/labs/utils/matchParticipantFromFilename";

const lucia: ParticipantLike = { id: "p1", displayName: "Lucia Schmidt" };
const jens: ParticipantLike = { id: "p2", displayName: "Jens Werner" };
const juergen: ParticipantLike = { id: "p3", displayName: "Jürgen Klopp" };
const oezgun: ParticipantLike = { id: "p4", displayName: "Özgün Atalay" };
const tobi: ParticipantLike = { id: "p5", name: "Tobias #ab12" };
const luciaTwo: ParticipantLike = { id: "p6", displayName: "Lucia Bauer" };

describe("matchParticipantFromFilename", () => {
  it("returns null for empty inputs", () => {
    expect(matchParticipantFromFilename("", [lucia])).toBeNull();
    expect(matchParticipantFromFilename("lucia.jpg", [])).toBeNull();
  });

  it("matches a unique first name in a simple filename", () => {
    const result = matchParticipantFromFilename("lucia.jpg", [lucia, jens]);
    expect(result?.participantId).toBe("p1");
    expect(result?.firstName).toBe("lucia");
  });

  it("is case-insensitive", () => {
    expect(matchParticipantFromFilename("LUCIA.JPG", [lucia])?.participantId).toBe("p1");
    expect(matchParticipantFromFilename("Lucia.png", [lucia])?.participantId).toBe("p1");
  });

  it("handles common separators and extra tokens", () => {
    expect(matchParticipantFromFilename("2024-12-31_lucia_portrait.jpg", [lucia])?.participantId).toBe("p1");
    expect(matchParticipantFromFilename("img.lucia.foto.png", [lucia])?.participantId).toBe("p1");
    expect(matchParticipantFromFilename("foto (lucia).jpg", [lucia])?.participantId).toBe("p1");
  });

  it("matches umlauts via German transliteration (ue) and via stripped form (u)", () => {
    expect(matchParticipantFromFilename("juergen.jpg", [juergen, jens])?.participantId).toBe("p3");
    expect(matchParticipantFromFilename("jurgen.jpg", [juergen, jens])?.participantId).toBe("p3");
    expect(matchParticipantFromFilename("oezguen.jpg", [oezgun])?.participantId).toBe("p4");
    expect(matchParticipantFromFilename("ozgun.jpg", [oezgun])?.participantId).toBe("p4");
  });

  it("strips guest suffix from participant names", () => {
    expect(matchParticipantFromFilename("tobias.jpg", [tobi, lucia])?.participantId).toBe("p5");
  });

  it("strips guest suffix from filename tokens", () => {
    expect(matchParticipantFromFilename("lucia #ab12.jpg", [lucia])?.participantId).toBe("p1");
  });

  it("rejects ambiguous matches when two participants share a first name", () => {
    expect(matchParticipantFromFilename("lucia.jpg", [lucia, luciaTwo, jens])).toBeNull();
  });

  it("returns null when no participant matches", () => {
    expect(matchParticipantFromFilename("sunset_landscape.jpg", [lucia, jens])).toBeNull();
  });

  it("ignores single-letter tokens to avoid false positives", () => {
    const a: ParticipantLike = { id: "px", displayName: "A" };
    expect(matchParticipantFromFilename("a_lucia.jpg", [a, lucia])?.participantId).toBe("p1");
  });

  it("ignores file extension when matching", () => {
    expect(matchParticipantFromFilename("jens.jpeg", [jens])?.participantId).toBe("p2");
    expect(matchParticipantFromFilename("jens.HEIC", [jens])?.participantId).toBe("p2");
  });
});
