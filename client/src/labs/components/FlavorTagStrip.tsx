import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import {
  getSortedCategories,
} from "@/labs/data/flavor-data";

type Phase = "nose" | "taste" | "finish";
const PHASES: { id: Phase; en: string }[] = [
  { id: "nose", en: "Nose" },
  { id: "taste", en: "Taste" },
  { id: "finish", en: "Finish" },
];

interface FlavorTagStripProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  profileId: string | null;
}

function parseTagsFromNotes(notes: string): Record<Phase, string[]> {
  const result: Record<Phase, string[]> = { nose: [], taste: [], finish: [] };
  const marker = /\[([A-Za-z]+)\]\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(notes)) !== null) {
    const phase = m[1].toLowerCase() as Phase;
    if (result[phase]) {
      const tags = m[2].split(",").map((t) => t.trim()).filter(Boolean);
      result[phase].push(...tags);
    }
  }
  return result;
}

function buildTagLine(phase: Phase, tags: string[]): string {
  if (tags.length === 0) return "";
  return `[${phase.charAt(0).toUpperCase() + phase.slice(1)}] ${tags.join(", ")}`;
}

function replaceTagsInNotes(
  notes: string,
  phase: Phase,
  tags: string[]
): string {
  const label = phase.charAt(0).toUpperCase() + phase.slice(1);
  const regex = new RegExp(`\\[${label}\\]\\s*[^\\n]*`, "i");
  const newLine = buildTagLine(phase, tags);

  if (regex.test(notes)) {
    if (newLine) return notes.replace(regex, newLine);
    return notes.replace(regex, "").replace(/\n{2,}/g, "\n").trim();
  }

  if (!newLine) return notes;
  return notes ? `${notes.trimEnd()}\n${newLine}` : newLine;
}

export default function FlavorTagStrip({
  notes,
  onNotesChange,
  profileId,
}: FlavorTagStripProps) {
  const [activePhase, setActivePhase] = useState<Phase>("nose");
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");

  const sortedCategories = useMemo(
    () => getSortedCategories(profileId),
    [profileId]
  );

  const tagsByPhase = useMemo(() => parseTagsFromNotes(notes), [notes]);
  const activeTags = tagsByPhase[activePhase];

  const toggleTag = useCallback(
    (label: string) => {
      const current = [...activeTags];
      const idx = current.findIndex(
        (t) => t.toLowerCase() === label.toLowerCase()
      );
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(label);
      }
      onNotesChange(replaceTagsInNotes(notes, activePhase, current));
    },
    [activeTags, notes, activePhase, onNotesChange]
  );

  const addCustomTag = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (
      activeTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())
    )
      return;
    const current = [...activeTags, trimmed];
    onNotesChange(replaceTagsInNotes(notes, activePhase, current));
    setCustomInput("");
  }, [customInput, activeTags, notes, activePhase, onNotesChange]);

  const allTagCount =
    tagsByPhase.nose.length + tagsByPhase.taste.length + tagsByPhase.finish.length;

  return (
    <div
      className="labs-card labs-fade-in"
      style={{ padding: "12px 14px" }}
      data-testid="flavor-tag-strip"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: "var(--labs-text-muted)", letterSpacing: "0.03em" }}
        >
          Flavor Tags
        </span>
        {allTagCount > 0 && (
          <span
            className="text-[10px]"
            style={{
              color: "var(--labs-accent)",
              background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)",
              borderRadius: 9999,
              padding: "2px 8px",
            }}
            data-testid="flavor-tag-count"
          >
            {allTagCount} selected
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {PHASES.map((p) => {
          const count = tagsByPhase[p.id].length;
          return (
            <button
              key={p.id}
              onClick={() => setActivePhase(p.id)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                border:
                  activePhase === p.id
                    ? "1px solid var(--labs-accent)"
                    : "1px solid var(--labs-border)",
                background:
                  activePhase === p.id
                    ? "color-mix(in srgb, var(--labs-accent) 10%, transparent)"
                    : "var(--labs-surface)",
                color:
                  activePhase === p.id
                    ? "var(--labs-accent)"
                    : "var(--labs-text-muted)",
                transition: "all 150ms",
              }}
              data-testid={`flavor-phase-${p.id}`}
            >
              {p.en}
              {count > 0 && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 10,
          }}
          data-testid="flavor-selected-tags"
        >
          {activeTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "inherit",
                cursor: "pointer",
                background: "var(--labs-accent)",
                color: "var(--labs-bg)",
                border: "none",
              }}
              data-testid={`flavor-remove-${tag.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {tag}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxHeight: 220,
          overflowY: "auto",
        }}
      >
        {sortedCategories.map((cat) => {
          const isExpanded = expandedCatId === cat.id;
          const catTagCount = cat.subcategories.filter((sub) =>
            activeTags.some(
              (t) => t.toLowerCase() === sub.en.toLowerCase()
            )
          ).length;

          return (
            <div key={cat.id}>
              <button
                onClick={() =>
                  setExpandedCatId(isExpanded ? null : cat.id)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--labs-border)",
                  background: isExpanded
                    ? "var(--labs-surface-elevated)"
                    : "var(--labs-surface)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                data-testid={`flavor-cat-${cat.id}`}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: cat.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--labs-text)",
                  }}
                >
                  {cat.en}
                </span>
                {catTagCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      color: cat.color,
                      fontWeight: 600,
                    }}
                  >
                    {catTagCount}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp
                    className="w-3.5 h-3.5"
                    style={{ color: "var(--labs-text-muted)" }}
                  />
                ) : (
                  <ChevronDown
                    className="w-3.5 h-3.5"
                    style={{ color: "var(--labs-text-muted)" }}
                  />
                )}
              </button>

              {isExpanded && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                    padding: "8px 10px",
                  }}
                >
                  {cat.subcategories.map((sub) => {
                    const isSelected = activeTags.some(
                      (t) =>
                        t.toLowerCase() === sub.en.toLowerCase()
                    );
                    return (
                      <button
                        key={sub.id}
                        onClick={() => toggleTag(sub.en)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 500,
                          fontFamily: "inherit",
                          cursor: "pointer",
                          border: isSelected
                            ? "none"
                            : `1px solid ${cat.color}44`,
                          background: isSelected
                            ? cat.color
                            : `${cat.color}18`,
                          color: isSelected
                            ? "var(--labs-bg)"
                            : "var(--labs-text)",
                          transition: "all 150ms",
                        }}
                        data-testid={`flavor-tag-${sub.id}`}
                      >
                        {sub.en}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 8,
        }}
      >
        <input
          className="labs-input"
          placeholder="Custom descriptor..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomTag();
            }
          }}
          style={{ flex: 1, fontSize: 12, padding: "6px 10px" }}
          data-testid="flavor-custom-input"
        />
        <button
          onClick={addCustomTag}
          disabled={!customInput.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid var(--labs-border)",
            background: customInput.trim()
              ? "var(--labs-accent)"
              : "var(--labs-surface)",
            color: customInput.trim()
              ? "var(--labs-bg)"
              : "var(--labs-text-muted)",
            cursor: customInput.trim() ? "pointer" : "default",
            fontFamily: "inherit",
          }}
          data-testid="flavor-custom-add"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
