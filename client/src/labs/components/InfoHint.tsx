import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * Kleiner (i)-Hinweis neben einem Einstellungs-Label.
 *
 * Bewusst als Klick-Popover statt Hover-Tooltip: auf dem iPhone gibt es kein
 * Hover, und die Einstellungen werden ueberwiegend am Tisch mit dem Telefon
 * bedient. Der Ausloeser haelt 44px Touch-Target ein, ohne das Label optisch
 * auseinanderzuziehen — die sichtbare Flaeche bleibt klein, die klickbare nicht.
 */
export function InfoHint({ text, testId }: { text: string; testId?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={text}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          margin: "-16px -14px",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: open ? "var(--labs-accent)" : "var(--labs-text-muted)",
        }}
        data-testid={testId}
      >
        <Info style={{ width: 13, height: 13 }} />
      </button>
      {open && (
        <span
          role="note"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: -8,
            zIndex: 60,
            width: "min(280px, calc(100vw - 48px))",
            padding: 12,
            borderRadius: 8,
            background: "var(--labs-surface)",
            border: "1px solid var(--labs-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            fontSize: 12,
            lineHeight: 1.5,
            fontWeight: 400,
            letterSpacing: 0,
            textTransform: "none",
            color: "var(--labs-text-secondary)",
            whiteSpace: "normal",
          }}
          data-testid={testId ? `${testId}-popover` : undefined}
        >
          {text}
        </span>
      )}
    </span>
  );
}
