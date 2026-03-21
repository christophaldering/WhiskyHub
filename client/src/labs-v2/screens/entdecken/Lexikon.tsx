import { useState, useMemo } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { Back, BookOpen, Search, ChevronDown } from "../../icons";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { lexiconData, categoryLabelMap, type LexiconCategory } from "@/labs/data/lexiconData";

interface LexikonProps {
  onBack: () => void;
}

export default function Lexikon({ onBack }: LexikonProps) {
  const { th } = useV2Theme();
  const { t, lang } = useV2Lang();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const categories: LexiconCategory[] = lexiconData[lang] ?? lexiconData.en;
  const labels = categoryLabelMap[lang] ?? categoryLabelMap.en;

  const filtered = useMemo(() => {
    let cats = categories;
    if (activeCategory) {
      cats = cats.filter((c) => c.key === activeCategory);
    }
    if (!searchQuery.trim()) return cats;
    const q = searchQuery.toLowerCase();
    return cats
      .map((cat) => ({
        ...cat,
        entries: cat.entries.filter(
          (e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.entries.length > 0);
  }, [categories, searchQuery, activeCategory]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.xs,
          background: "none",
          border: "none",
          color: th.muted,
          fontSize: 14,
          fontFamily: FONT.body,
          cursor: "pointer",
          marginBottom: SP.md,
          minHeight: TOUCH_MIN,
          padding: 0,
        }}
        data-testid="button-back-lexikon"
      >
        <Back color={th.muted} size={18} />
        {t.entTitle}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
        <BookOpen color={th.gold} size={22} />
        <h1
          style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, margin: 0 }}
          data-testid="text-lexikon-title"
        >
          {t.entLexikon}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: th.muted, marginBottom: SP.md }}>{t.entLexikonSub}</p>

      <div style={{ position: "relative", marginBottom: SP.md }}>
        <Search color={th.muted} size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.entLexSearch}
          style={{
            width: "100%",
            boxSizing: "border-box",
            height: TOUCH_MIN,
            paddingLeft: 36,
            paddingRight: SP.md,
            background: th.inputBg,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.md,
            color: th.text,
            fontSize: 14,
            fontFamily: FONT.body,
            outline: "none",
          }}
          data-testid="input-lexikon-search"
        />
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: SP.md, paddingBottom: 4 }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: "5px 12px",
            borderRadius: RADIUS.full,
            border: `1px solid ${!activeCategory ? th.gold : th.border}`,
            background: !activeCategory ? th.gold : "transparent",
            color: !activeCategory ? th.bg : th.muted,
            fontSize: 11,
            fontWeight: 500,
            fontFamily: FONT.body,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          data-testid="chip-lexikon-all"
        >
          {t.entFilterAll}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
            style={{
              padding: "5px 12px",
              borderRadius: RADIUS.full,
              border: `1px solid ${activeCategory === cat.key ? th.gold : th.border}`,
              background: activeCategory === cat.key ? th.gold : "transparent",
              color: activeCategory === cat.key ? th.bg : th.muted,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: FONT.body,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            data-testid={`chip-lexikon-${cat.key}`}
          >
            {labels[cat.key] ?? cat.key}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: SP.xxl }} data-testid="text-lexikon-empty">
          <BookOpen color={th.faint} size={40} style={{ marginBottom: SP.md }} />
          <p style={{ color: th.muted, fontSize: 14 }}>No results found</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
          {filtered.map((cat) => {
            const isOpen = !!searchQuery.trim() || openSections[cat.key];
            return (
              <div
                key={cat.key}
                style={{
                  background: th.bgCard,
                  border: `1px solid ${th.border}`,
                  borderRadius: RADIUS.md,
                  overflow: "hidden",
                }}
                data-testid={`lexikon-section-${cat.key}`}
              >
                <button
                  onClick={() => toggleSection(cat.key)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: SP.sm,
                    padding: `14px ${SP.md}px`,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  data-testid={`button-toggle-${cat.key}`}
                >
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: th.text, fontFamily: FONT.body }}>
                    {labels[cat.key] ?? cat.key}
                  </span>
                  <span style={{ fontSize: 11, color: th.muted }}>{cat.entries.length}</span>
                  <ChevronDown
                    color={th.muted}
                    size={16}
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: `0 ${SP.md}px 14px`, borderTop: `1px solid ${th.border}` }}>
                    {cat.entries.map((entry) => (
                      <div key={entry.term} style={{ padding: "10px 0", borderBottom: `1px solid ${th.border}` }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{entry.term}</div>
                        <div style={{ fontSize: 12, color: th.muted, marginTop: 2, lineHeight: 1.5 }}>{entry.definition}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
