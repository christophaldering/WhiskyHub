import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Camera, ImagePlus, PenLine, Barcode, Loader2, AlertTriangle, ArrowLeft, Wine, ChevronRight, ScanLine, X, Layers } from "lucide-react";
import { useLocation } from "wouter";
import BottleRecognitionFeedback, { type BottleRecognitionResult } from "@/labs/components/BottleRecognitionFeedback";
import { CollectionPicker, type SelectedWhisky } from "@/labs/components/CollectionPicker";

export interface CapturedWhisky {
  id?: string;
  name: string;
  distillery: string;
  country: string;
  region: string;
  cask: string;
  age: string;
  abv: string;
  fromAI: boolean;
  barcodeValue?: string;
}

interface Props {
  participantId: string;
  isAuthenticated: boolean;
  onManual: () => void;
  onCaptured: (w: CapturedWhisky, imageFile?: File | null) => void;
  onBarcode: (barcode: string) => void;
  onCollectionSelect: (w: CapturedWhisky) => void;
  onBack: () => void;
  hideBack?: boolean;
}

type Status = "idle" | "identifying" | "error" | "barcode" | "feedback" | "barcode-scanning" | "barcode-lookup";

export default function SoloCaptureScreen({ participantId, isAuthenticated, onManual, onCaptured, onBarcode, onCollectionSelect, onBack, hideBack }: Props) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [aiResult, setAiResult] = useState<BottleRecognitionResult | null>(null);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const handleCollectionPickerSelect = (selected: SelectedWhisky) => {
    const captured: CapturedWhisky = {
      name: selected.name,
      distillery: selected.distillery || "",
      country: selected.country || "",
      region: selected.region || "",
      cask: selected.cask || "",
      age: selected.age || "",
      abv: selected.abv || "",
      fromAI: false,
    };
    setShowCollectionPicker(false);
    onCollectionSelect(captured);
  };

  const handlePhoto = () => {
    fileRef.current?.click();
  };

  const handleGalleryUpload = () => {
    galleryRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    setStatus("identifying");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("participantId", participantId);

      const res = await fetch("/api/journal/identify-bottle", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || t("v2.solo.identifyFail", "Identification failed"));
      }

      const data = await res.json();
      const whiskies = Array.isArray(data.whiskies) ? data.whiskies : [];
      const bottle = whiskies[0] || {};

      const recognitionResult: BottleRecognitionResult = {
        whiskyName: bottle.whiskyName || bottle.matchedExisting || "",
        distillery: bottle.distillery || "",
        country: bottle.country || "",
        region: bottle.region || "",
        caskType: bottle.caskType || "",
        age: bottle.age ? String(bottle.age) : "",
        abv: bottle.abv ? String(bottle.abv) : "",
        confidence: typeof bottle.confidence === "number" ? bottle.confidence : 75,
      };
      setAiResult(recognitionResult);
      setStatus("feedback");
    } catch (err: unknown) {
      setStatus("error");
      const message = err instanceof Error ? err.message : t("v2.solo.identifyFail", "Identification failed");
      setErrorMsg(message);
    }

    if (fileRef.current) fileRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const [barcodeLookupError, setBarcodeLookupError] = useState("");
  const [barcodeFromScan, setBarcodeFromScan] = useState(false);

  const performBarcodeLookup = useCallback(async (code: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setStatus("barcode-lookup");
    setBarcodeLookupError("");
    try {
      const res = await fetch(`/api/barcode-lookup/${encodeURIComponent(code)}`);
      if (res.status === 400) {
        isProcessingRef.current = false;
        setStatus("barcode");
        setBarcodeLookupError(t("v2.solo.invalidBarcode", "Invalid barcode. Please enter an 8-14 digit EAN/UPC number."));
        return;
      }
      if (res.ok) {
        const result = await res.json();
        if (result.found && result.data) {
          const recognitionResult: BottleRecognitionResult = {
            whiskyName: result.data.name || "",
            distillery: result.data.distillery || "",
            country: result.data.country || "",
            region: result.data.region || "",
            caskType: result.data.caskType || "",
            age: result.data.age || "",
            abv: result.data.abv || "",
            confidence: result.data.confidence || 75,
          };
          setAiResult(recognitionResult);
          setBarcodeValue(code);
          setBarcodeFromScan(true);
          setStatus("feedback");
          isProcessingRef.current = false;
          return;
        }
      }
      isProcessingRef.current = false;
      onBarcode(code);
    } catch {
      isProcessingRef.current = false;
      onBarcode(code);
    }
  }, [onBarcode, t]);

  const stopCameraScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState?.();
        if (state === 2) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch {}
  }, []);

  const startCameraScanner = useCallback(async () => {
    setStatus("barcode-scanning");
    isProcessingRef.current = false;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      await new Promise((r) => setTimeout(r, 100));
      const scannerId = "barcode-scanner-region";
      const el = document.getElementById(scannerId);
      if (!el) return;

      const scanner = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 120 },
          formatsToSupport: [2, 3, 4, 5, 8, 9, 10, 12, 13, 14, 15, 16],
        },
        (decodedText: string) => {
          if (isProcessingRef.current) return;
          const cleaned = decodedText.trim();
          if (cleaned) {
            isProcessingRef.current = true;
            scanner.stop().then(() => scanner.clear()).catch(() => {});
            html5QrCodeRef.current = null;
            isProcessingRef.current = false;
            performBarcodeLookup(cleaned);
          }
        },
        () => {}
      );
    } catch (err: any) {
      console.warn("Camera scanner error:", err);
      setStatus("barcode");
      setBarcodeLookupError(t("v2.solo.cameraError", "Could not access camera. Please enter the barcode manually."));
    }
  }, [performBarcodeLookup, t]);

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [stopCameraScanner]);

  const handleBarcodeSubmit = () => {
    const trimmed = barcodeValue.trim();
    if (trimmed.length > 0) {
      performBarcodeLookup(trimmed);
    }
  };

  const handleFeedbackConfirm = (data: BottleRecognitionResult) => {
    onCaptured({
      name: data.whiskyName,
      distillery: data.distillery,
      country: data.country || "",
      region: data.region,
      cask: data.caskType,
      age: data.age,
      abv: data.abv,
      fromAI: true,
      barcodeValue: barcodeValue || undefined,
    }, capturedFile);
  };

  const handleFeedbackDismiss = () => {
    setAiResult(null);
    setCapturedFile(null);
    if (barcodeFromScan) {
      setBarcodeFromScan(false);
      onBarcode(barcodeValue);
    } else {
      setStatus("idle");
    }
  };

  if (status === "feedback" && aiResult) {
    return (
      <div className="labs-fade-in" style={{ minHeight: 400 }}>
        <BottleRecognitionFeedback
          result={aiResult}
          participantId={participantId}
          onConfirm={handleFeedbackConfirm}
          onDismiss={handleFeedbackDismiss}
        />
      </div>
    );
  }

  if (status === "identifying") {
    return (
      <div className="labs-fade-in" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        gap: "var(--labs-space-lg)",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--labs-accent-muted)",
        }}>
          <Loader2 size={32} style={{ color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
        </div>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--labs-text-muted)", margin: 0 }} data-testid="solo-identifying-text">
          {t("v2.solo.identifying", "Identifying whisky...")}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="labs-fade-in">
        <div className="labs-card" style={{
          padding: "var(--labs-space-xl)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--labs-space-lg)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--labs-danger-muted)",
          }}>
            <AlertTriangle size={28} style={{ color: "var(--labs-danger)" }} />
          </div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--labs-text)", textAlign: "center", margin: 0 }} data-testid="solo-error-text">
            {t("v2.solo.identifyFail", "Identification failed")}
          </p>
          {errorMsg && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--labs-text-muted)", textAlign: "center", margin: 0 }}>
              {errorMsg}
            </p>
          )}
          <button
            onClick={() => { setStatus("idle"); setErrorMsg(""); }}
            data-testid="solo-retry-btn"
            className="labs-btn-secondary"
            style={{ minWidth: 140 }}
          >
            {t("v2.solo.identifyRetry", "Try again")}
          </button>
        </div>
      </div>
    );
  }

  if (status === "barcode-lookup") {
    return (
      <div className="labs-fade-in" style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 400,
        gap: "var(--labs-space-lg)",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--labs-phase-finish-dim)",
        }}>
          <Loader2 size={32} style={{ color: "var(--labs-phase-finish)", animation: "spin 1s linear infinite" }} />
        </div>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--labs-text-muted)", margin: 0 }} data-testid="solo-barcode-lookup-text">
          {t("v2.solo.barcodeLookup", "Looking up barcode...")}
        </p>
      </div>
    );
  }

  if (status === "barcode-scanning") {
    return (
      <div className="labs-fade-in">
        <button
          onClick={() => { stopCameraScanner(); setStatus("barcode"); }}
          data-testid="solo-scanner-back-btn"
          className="labs-btn-ghost"
          style={{ padding: 0, marginBottom: "var(--labs-space-lg)", display: "flex", alignItems: "center", gap: "var(--labs-space-sm)" }}
        >
          <ArrowLeft size={18} />
          {t("v2.back", "Back")}
        </button>

        <h2 className="labs-h2" style={{ marginBottom: "var(--labs-space-lg)" }}>
          {t("v2.solo.scanBarcode", "Scan Barcode")}
        </h2>

        <div className="labs-card" style={{
          padding: "var(--labs-space-lg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--labs-space-md)",
        }}>
          <div
            id="barcode-scanner-region"
            ref={scannerRef}
            data-testid="solo-barcode-scanner"
            style={{ width: "100%", maxWidth: 400, minHeight: 250, borderRadius: 12, overflow: "hidden" }}
          />
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--labs-text-muted)", textAlign: "center", margin: 0 }}>
            {t("v2.solo.scanHint", "Point your camera at the barcode on the bottle")}
          </p>
          <button
            onClick={() => { stopCameraScanner(); setStatus("barcode"); }}
            data-testid="solo-scanner-cancel-btn"
            className="labs-btn-secondary"
            style={{ minWidth: 140 }}
          >
            {t("v2.solo.enterManually", "Enter manually")}
          </button>
        </div>
      </div>
    );
  }

  if (status === "barcode") {
    return (
      <div className="labs-fade-in">
        <button
          onClick={() => { setStatus("idle"); setBarcodeValue(""); setBarcodeLookupError(""); }}
          data-testid="solo-barcode-back-btn"
          className="labs-btn-ghost"
          style={{ padding: 0, marginBottom: "var(--labs-space-lg)", display: "flex", alignItems: "center", gap: "var(--labs-space-sm)" }}
        >
          <ArrowLeft size={18} />
          {t("v2.back", "Back")}
        </button>

        <h2 className="labs-h2" style={{ marginBottom: "var(--labs-space-lg)" }}>
          {t("v2.solo.barcodeInput", "Enter barcode")}
        </h2>

        <div className="labs-card" style={{
          padding: "var(--labs-space-xl)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--labs-space-lg)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--labs-phase-finish-dim)",
          }}>
            <Barcode size={28} style={{ color: "var(--labs-phase-finish)" }} />
          </div>

          <button
            onClick={startCameraScanner}
            data-testid="solo-barcode-scan-btn"
            className="labs-btn-secondary"
            style={{ width: "100%", maxWidth: 300, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <ScanLine size={18} />
            {t("v2.solo.scanWithCamera", "Scan with Camera")}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 300 }}>
            <div style={{ flex: 1, height: 1, background: "var(--labs-border)" }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--labs-text-muted)" }}>
              {t("v2.solo.or", "or")}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--labs-border)" }} />
          </div>

          <input
            type="text"
            inputMode="numeric"
            value={barcodeValue}
            onChange={(e) => setBarcodeValue(e.target.value)}
            placeholder={t("v2.solo.barcodeInputPH", "EAN / UPC number")}
            autoFocus
            data-testid="solo-barcode-input"
            className="labs-input"
            style={{ textAlign: "center", letterSpacing: "0.1em", fontSize: 18, maxWidth: 300 }}
            onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeSubmit(); }}
          />

          {barcodeLookupError && (
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--labs-danger)", textAlign: "center", margin: 0 }} data-testid="solo-barcode-error">
              {barcodeLookupError}
            </p>
          )}

          <button
            onClick={handleBarcodeSubmit}
            disabled={barcodeValue.trim().length === 0}
            data-testid="solo-barcode-submit-btn"
            className="labs-btn-primary"
            style={{ width: "100%", maxWidth: 300, minHeight: 44 }}
          >
            {t("v2.solo.barcodeSubmit", "Continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="labs-fade-in">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
        data-testid="solo-file-input"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
        data-testid="solo-gallery-input"
      />

      {!hideBack && (
        <button
          onClick={onBack}
          data-testid="solo-back-btn"
          className="labs-btn-ghost"
          style={{ padding: 0, marginBottom: "var(--labs-space-lg)", display: "flex", alignItems: "center", gap: "var(--labs-space-sm)" }}
        >
          <ArrowLeft size={18} />
          {t("v2.back", "Back")}
        </button>
      )}

      <h2 className="labs-h2" data-testid="solo-title" style={{ marginBottom: "var(--labs-space-sm)" }}>
        {t("v2.solo.title", "Log a Dram")}
      </h2>

      <p style={{
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        color: "var(--labs-text-muted)",
        marginBottom: "var(--labs-space-xl)",
        marginTop: 0,
      }} data-testid="solo-capture-sub">
        {t("v2.solo.captureSub", "How would you like to capture the whisky?")}
      </p>

      <span className="labs-section-label">{t("v2.solo.captureOptions", "Capture Options")}</span>

      <div className="labs-grouped-list" style={{ marginBottom: "var(--labs-space-lg)" }}>
        <button
          type="button"
          onClick={handlePhoto}
          data-testid="solo-photo-btn"
          className="labs-list-row"
          style={{ gap: 12, width: "100%", border: "none", textAlign: "left", font: "inherit", color: "inherit" }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: "var(--labs-phase-nose-dim)",
          }}>
            <Camera className="w-5 h-5" style={{ color: "var(--labs-phase-nose)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
              {t("v2.solo.photo", "Take a Photo")}
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>
              {t("v2.solo.photoDesc", "Photograph the bottle and identify via AI")}
            </div>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
        </button>

        <button
          type="button"
          onClick={handleGalleryUpload}
          data-testid="solo-upload-btn"
          className="labs-list-row"
          style={{ gap: 12, width: "100%", border: "none", textAlign: "left", font: "inherit", color: "inherit" }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: "var(--labs-phase-nose-dim)",
          }}>
            <ImagePlus className="w-5 h-5" style={{ color: "var(--labs-phase-nose)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
              {t("v2.solo.upload", "Upload Photo")}
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>
              {t("v2.solo.uploadDesc", "Choose an existing photo from your gallery")}
            </div>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
        </button>

        <button
          type="button"
          onClick={onManual}
          data-testid="solo-manual-btn"
          className="labs-list-row"
          style={{ gap: 12, width: "100%", border: "none", textAlign: "left", font: "inherit", color: "inherit" }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: "var(--labs-phase-palate-dim)",
          }}>
            <PenLine className="w-5 h-5" style={{ color: "var(--labs-phase-palate)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
              {t("v2.solo.manual", "Manual Entry")}
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>
              {t("v2.solo.manualDesc", "Enter name, distillery, and details yourself")}
            </div>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
        </button>

        <button
          type="button"
          onClick={() => setStatus("barcode")}
          data-testid="solo-barcode-btn"
          className="labs-list-row"
          style={{ gap: 12, width: "100%", border: "none", textAlign: "left", font: "inherit", color: "inherit" }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: "var(--labs-phase-finish-dim)",
          }}>
            <Barcode className="w-5 h-5" style={{ color: "var(--labs-phase-finish)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
              {t("v2.solo.barcode", "Scan Barcode")}
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>
              {t("v2.solo.barcodeDesc", "Read an EAN or QR code")}
            </div>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
        </button>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setShowCollectionPicker(true)}
            data-testid="solo-collection-btn"
            className="labs-list-row"
            style={{ gap: 12, width: "100%", border: "none", textAlign: "left", font: "inherit", color: "inherit" }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: "var(--labs-accent-muted)",
            }}>
              <Wine className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                {t("v2.solo.collection", "From my Collection")}
              </div>
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>
                {t("v2.solo.collectionDesc", "Pick a whisky from your collection to taste")}
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate("/labs/fair-mode")}
          data-testid="solo-fair-mode-btn"
          className="labs-list-row"
          style={{ gap: 12, width: "100%", border: "none", textAlign: "left", font: "inherit", color: "inherit" }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: "var(--labs-accent-muted)",
          }}>
            <Layers className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
              {t("v2.solo.fairMode", "Messe-Modus")}
            </div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>
              {t("v2.solo.fairModeDesc", "Capture multiple drams in quick succession")}
            </div>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
        </button>
      </div>

      {showCollectionPicker && (
        <CollectionPicker
          participantId={participantId}
          onSelect={handleCollectionPickerSelect}
          onClose={() => setShowCollectionPicker(false)}
        />
      )}
    </div>
  );
}
