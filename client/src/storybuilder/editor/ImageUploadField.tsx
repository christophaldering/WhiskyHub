import { useCallback, useId, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  testId?: string;
  placeholder?: string;
};

export function ImageUploadField({ value, onChange, label, testId, placeholder }: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const resp = await fetch("/api/cms/upload", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!resp.ok) {
          let msg = "Upload fehlgeschlagen";
          try {
            const data = (await resp.json()) as { message?: string };
            if (data.message) msg = data.message;
          } catch {
            msg = "Upload fehlgeschlagen";
          }
          throw new Error(msg);
        }
        const data = (await resp.json()) as { url?: string };
        if (!data.url) throw new Error("Antwort ohne URL");
        onChange(data.url);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void uploadFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void uploadFile(file);
    },
    [uploadFile],
  );

  const baseTestId = testId ?? "image-upload";
  return (
    <div style={containerStyle}>
      {label ? (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "/objects/... oder https://..."}
        style={inputStyle}
        data-testid={`input-url-${baseTestId}`}
      />
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          ...dropZoneStyle,
          background: dragOver ? "rgba(201,169,97,0.18)" : dropZoneStyle.background,
          borderColor: dragOver ? "#C9A961" : "rgba(201,169,97,0.35)",
        }}
        data-testid={`dropzone-${baseTestId}`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Bild hochladen"
          style={busy ? { ...uploadBtnStyle, opacity: 0.6, cursor: "wait" } : uploadBtnStyle}
          data-testid={`button-upload-${baseTestId}`}
        >
          {busy ? "Lädt hoch…" : "Hochladen"}
        </button>
        <span style={hintStyle}>oder Datei hierher ziehen (JPG/PNG/WebP/GIF, max 20 MB)</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onPick}
          style={{ display: "none" }}
          data-testid={`fileinput-${baseTestId}`}
        />
      </div>
      {value ? (
        <div style={previewWrap}>
          <img
            src={value}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ maxWidth: "100%", maxHeight: 120, display: "block", borderRadius: 3 }}
            data-testid={`preview-${baseTestId}`}
          />
        </div>
      ) : null}
      {error ? (
        <div role="alert" style={errorStyle} data-testid={`error-${baseTestId}`}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
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

const dropZoneStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  border: "1px dashed rgba(201,169,97,0.35)",
  borderRadius: 4,
  padding: "10px 12px",
  background: "rgba(201,169,97,0.04)",
  transition: "background .15s, border-color .15s",
};

const uploadBtnStyle: React.CSSProperties = {
  background: "#C9A961",
  color: "#0B0906",
  border: "none",
  borderRadius: 3,
  padding: "6px 14px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#A89A85",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const previewWrap: React.CSSProperties = {
  border: "1px solid rgba(201,169,97,0.15)",
  borderRadius: 4,
  padding: 6,
  background: "rgba(0,0,0,0.2)",
  display: "inline-block",
};

const errorStyle: React.CSSProperties = {
  background: "rgba(217,119,87,0.12)",
  color: "#d97757",
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: 3,
};
