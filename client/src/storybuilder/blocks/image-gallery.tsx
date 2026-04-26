import { z } from "zod";
import type { BlockDefinition, BlockEditorPanelProps, BlockRendererProps } from "../core/types";
import { safeUrl } from "../editor/RichTextEditor";

const itemSchema = z.object({
  url: z.string().default(""),
  alt: z.string().optional().default(""),
  caption: z.string().optional().default(""),
});

const payloadSchema = z.object({
  items: z.array(itemSchema).default([]),
  columns: z.enum(["2", "3", "4"]).default("3"),
  rounded: z.boolean().default(false),
});

type Payload = z.infer<typeof payloadSchema>;
type Item = z.infer<typeof itemSchema>;

function Renderer({ payload, theme }: BlockRendererProps<Payload>) {
  const cols = parseInt(payload.columns, 10);
  const visible = payload.items
    .map((i) => ({ ...i, url: safeUrl(i.url) }))
    .filter((i) => i.url.length > 0);
  if (visible.length === 0) {
    return (
      <section
        data-testid="block-image-gallery-empty"
        style={{
          padding: "3rem 2rem",
          maxWidth: 900,
          margin: "0 auto",
          textAlign: "center",
          fontFamily: theme.fonts.sans,
          color: theme.colors.inkFaint,
          border: `1px dashed ${theme.colors.amberDim}`,
          borderRadius: 4,
        }}
      >
        Noch keine Bilder in der Galerie
      </section>
    );
  }
  return (
    <section
      data-testid="block-image-gallery"
      style={{
        padding: "clamp(2rem, 5vw, 4rem) 2rem",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap: 16,
        }}
      >
        {visible.map((item, idx) => (
          <figure key={idx} style={{ margin: 0 }} data-testid={`gallery-item-${idx}`}>
            <img
              src={item.url}
              alt={item.alt ?? ""}
              loading="lazy"
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                objectFit: "cover",
                display: "block",
                borderRadius: payload.rounded ? 8 : 2,
                boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
              }}
            />
            {item.caption ? (
              <figcaption
                style={{
                  fontFamily: theme.fonts.serif,
                  fontStyle: "italic",
                  fontSize: ".8rem",
                  color: theme.colors.inkFaint,
                  textAlign: "center",
                  marginTop: ".5rem",
                }}
              >
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

function EditorPanel({ payload, onChange }: BlockEditorPanelProps<Payload>) {
  const set = <K extends keyof Payload>(key: K, value: Payload[K]) => onChange({ ...payload, [key]: value });
  const updateItem = (idx: number, patch: Partial<Item>) => {
    const items = payload.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    set("items", items);
  };
  const addItem = () => set("items", [...payload.items, { url: "", alt: "", caption: "" }]);
  const removeItem = (idx: number) => set("items", payload.items.filter((_, i) => i !== idx));
  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= payload.items.length) return;
    const items = [...payload.items];
    const tmp = items[idx];
    items[idx] = items[target];
    items[target] = tmp;
    set("items", items);
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={labelStyle}>
        <span>Spalten</span>
        <select
          value={payload.columns}
          onChange={(e) => {
            const v = e.target.value;
            set("columns", v === "2" ? "2" : v === "4" ? "4" : "3");
          }}
          style={inputStyle}
          data-testid="select-gallery-columns"
        >
          <option value="2">2 Spalten</option>
          <option value="3">3 Spalten</option>
          <option value="4">4 Spalten</option>
        </select>
      </label>
      <label style={{ ...labelStyle, flexDirection: "row", display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={payload.rounded}
          onChange={(e) => set("rounded", e.target.checked)}
          data-testid="checkbox-gallery-rounded"
        />
        <span>Abgerundete Ecken</span>
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        {payload.items.map((item, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid rgba(201,169,97,0.15)",
              borderRadius: 4,
              padding: 8,
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#A89A85" }}>Bild {idx + 1}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  style={miniButtonStyle}
                  data-testid={`button-gallery-up-${idx}`}
                  title="Nach oben"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  style={miniButtonStyle}
                  data-testid={`button-gallery-down-${idx}`}
                  title="Nach unten"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  style={{ ...miniButtonStyle, color: "#d97757" }}
                  data-testid={`button-gallery-remove-${idx}`}
                  title="Entfernen"
                >
                  ✕
                </button>
              </div>
            </div>
            <input
              type="text"
              value={item.url}
              onChange={(e) => updateItem(idx, { url: e.target.value })}
              placeholder="Bild-URL"
              style={inputStyle}
              data-testid={`input-gallery-url-${idx}`}
            />
            <input
              type="text"
              value={item.alt ?? ""}
              onChange={(e) => updateItem(idx, { alt: e.target.value })}
              placeholder="Alt-Text"
              style={inputStyle}
              data-testid={`input-gallery-alt-${idx}`}
            />
            <input
              type="text"
              value={item.caption ?? ""}
              onChange={(e) => updateItem(idx, { caption: e.target.value })}
              placeholder="Bildunterschrift (optional)"
              style={inputStyle}
              data-testid={`input-gallery-caption-${idx}`}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        style={{
          background: "rgba(201,169,97,0.1)",
          border: "1px dashed rgba(201,169,97,0.4)",
          color: "#C9A961",
          padding: "8px 10px",
          borderRadius: 4,
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 12,
          cursor: "pointer",
        }}
        data-testid="button-gallery-add-item"
      >
        + Bild hinzufügen
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 12,
  color: "#A89A85",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.06)",
  border: "1px solid rgba(201,169,97,0.25)",
  borderRadius: 4,
  padding: "8px 10px",
  color: "#F5EDE0",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 13,
  outline: "none",
};

const miniButtonStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.08)",
  border: "1px solid rgba(201,169,97,0.2)",
  borderRadius: 3,
  padding: "2px 6px",
  fontSize: 11,
  color: "#A89A85",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
  minWidth: 24,
};

export const imageGalleryBlock: BlockDefinition<Payload> = {
  type: "image-gallery",
  label: "Bildergalerie",
  description: "Raster aus mehreren Bildern mit optionaler Bildunterschrift.",
  category: "generic",
  defaultPayload: () => ({ items: [], columns: "3", rounded: false }),
  payloadSchema,
  Renderer,
  EditorPanel,
};
