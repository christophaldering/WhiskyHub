import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Camera, Loader2, ScanBarcode } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setError("");
      setLoading(true);
      hasScannedRef.current = false;
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (cancelled || !containerRef.current) return;

        await stopScanner();

        const scannerId = "barcode-scanner-view";
        let scannerDiv = document.getElementById(scannerId);
        if (!scannerDiv && containerRef.current) {
          scannerDiv = document.createElement("div");
          scannerDiv.id = scannerId;
          containerRef.current.appendChild(scannerDiv);
        }

        if (!scannerDiv || cancelled) return;

        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText: string) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            onScan(decodedText);
            stopScanner();
          },
          () => {}
        );

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLoading(false);
          if (err?.message?.includes("Permission") || err?.name === "NotAllowedError") {
            setError(t("barcode.cameraPermissionDenied"));
          } else if (err?.message?.includes("not found") || err?.name === "NotFoundError") {
            setError(t("barcode.noCameraFound"));
          } else {
            setError(t("barcode.cameraError"));
          }
        }
      }
    };

    const timer = setTimeout(startScanner, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [open, onScan, stopScanner, t]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-serif flex items-center gap-2">
              <ScanBarcode className="w-5 h-5" />
              {t("barcode.scanTitle")}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
              data-testid="button-close-barcode-scanner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative min-h-[300px] bg-black">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 z-10">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">{t("barcode.cameraLoading")}</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 z-10 px-6 text-center">
              <Camera className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="secondary" size="sm" onClick={handleClose} data-testid="button-barcode-error-close">
                {t("common.close")}
              </Button>
            </div>
          )}

          <div ref={containerRef} className="w-full" />
        </div>

        <div className="p-3 text-center">
          <p className="text-xs text-muted-foreground">{t("barcode.hint")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
