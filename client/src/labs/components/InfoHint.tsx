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
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  // Das Popover wird fest im Viewport positioniert statt relativ zum Label.
  // Nur so laesst sich garantieren, dass es an keinem Rand abgeschnitten wird —
  // und genau das passierte bei (i)-Symbolen weit rechts.
  const place = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(300, window.innerWidth - margin * 2);
    let left = r.left - 8;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
    if (left < margin) left = margin;
    setPos({ top: r.bottom + 8, left, width });
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReflow = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!open) place();
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
      {open && pos && (
        <span
          role="note"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 60,
            width: pos.width,
            maxHeight: "60vh",
            overflowY: "auto",
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
