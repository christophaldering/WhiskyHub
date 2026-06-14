import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FONT } from "@/labs/components/rating/theme";

// Barcode-Scanner fuer das Check-Sheet. Spiegelt das erprobte html5-qrcode-Muster
// aus SoloCaptureScreen (facingMode environment, EAN/UPC-Formate). Liefert den
// erkannten Code an onDetected; bei Kamera-/Init-Fehlern -> onCancel.
const SCANNER_ID = "check-barcode-scanner-region";

export default function CheckBarcodeScanner({
  onDetected,
  onCancel,
}: {
  onDetected: (code: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const scannerRef = useRef<any>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        await new Promise((r) => setTimeout(r, 100));
        if (cancelled) return;
        const el = document.getElementById(SCANNER_ID);
        if (!el) return;

        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            formatsToSupport: [2, 3, 4, 5, 8, 9, 10, 12, 13, 14, 15, 16],
          },
          (decodedText: string) => {
            if (processingRef.current) return;
            const cleaned = decodedText.trim();
            if (!cleaned) return;
            processingRef.current = true;
            scanner.stop().then(() => scanner.clear()).catch(() => {});
            scannerRef.current = null;
            onDetected(cleaned);
          },
          () => {},
        );
      } catch (err) {
        console.warn("Check barcode scanner error:", err);
        if (!cancelled) onCancel();
      }
    };

    start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        try {
          const state = s.getState?.();
          if (state === 2) {
            s.stop().then(() => s.clear()).catch(() => {});
          } else {
            s.clear?.();
          }
        } catch { /* best-effort cleanup */ }
        scannerRef.current = null;
      }
    };
    // einmalig beim Mount starten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p
        style={{ fontFamily: FONT.serif, fontSize: 16, color: "var(--labs-text-secondary)", margin: 0 }}
        data-testid="check-barcode-hint"
      >
        {t("check.barcode.hint", "Halte den Barcode (EAN/UPC) in den Rahmen")}
      </p>
      <div
        id={SCANNER_ID}
        style={{ width: "100%", minHeight: 220, borderRadius: 12, overflow: "hidden", background: "#000" }}
        data-testid="check-barcode-region"
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid var(--labs-border)",
            background: "transparent",
            color: "var(--labs-text-secondary)",
            fontFamily: FONT.body,
            fontSize: 14,
            cursor: "pointer",
          }}
          data-testid="check-barcode-cancel"
        >
          {t("ui.cancel", "Abbrechen")}
        </button>
      </div>
    </div>
  );
}
