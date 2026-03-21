import { useState, useCallback, useRef, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Copy, QrCode, Mail, ChevronDown, Download, Play, Check } from "../../icons";

interface Props {
  th: ThemeTokens;
  t: Translations;
  tastingId: string;
  tastingCode: string;
  hostId: string;
  onDone: () => void;
}

interface EmailResult {
  email: string;
  emailSent: boolean;
}

export default function HostStep3Invitations({ th, t, tastingId, tastingCode, hostId, onDone }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [sending, setSending] = useState(false);
  const [emailResults, setEmailResults] = useState<EmailResult[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const joinUrl = `${window.location.origin}/v2?join=${tastingCode}`;
        const dataUrl = await QRCode.toDataURL(joinUrl, {
          width: 300,
          margin: 2,
          color: { dark: "#1a1208", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
      } catch (e) {
        console.warn("QR generation failed:", e);
      }
    };
    generateQR();
  }, [tastingCode]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tastingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [tastingCode]);

  const downloadQR = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `tasting-${tastingCode}-qr.png`;
    a.click();
  }, [qrDataUrl, tastingCode]);

  const sendInvites = useCallback(async () => {
    const emails = emailText
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.includes("@"));
    if (emails.length === 0) return;

    setSending(true);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-participant-id": hostId },
        body: JSON.stringify({ emails, personalNote: personalNote || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailResults(data.invites || []);
        setEmailText("");
      }
    } catch {}
    setSending(false);
  }, [emailText, personalNote, tastingId, hostId]);

  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const startTasting = useCallback(async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open", hostId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start tasting");
      }
      onDone();
    } catch (e: any) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  }, [tastingId, hostId, onDone]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div
        data-testid="host-code-card"
        style={{
          background: th.bgCard,
          border: `1px solid ${th.border}`,
          borderRadius: RADIUS.xl,
          padding: SP.xl,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: SP.md,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: th.muted, fontFamily: FONT.body, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {t.hostCode}
        </span>
        <span
          data-testid="host-code-display"
          style={{
            fontFamily: FONT.display,
            fontSize: 40,
            fontWeight: 700,
            color: th.gold,
            letterSpacing: "0.15em",
            userSelect: "all",
          }}
        >
          {tastingCode}
        </span>
        <button
          data-testid="host-copy-code-btn"
          onClick={copyCode}
          style={{
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
            padding: `${SP.sm}px ${SP.md}px`,
            minHeight: 36,
            background: copied ? th.green : th.bgHover,
            border: `1px solid ${copied ? th.green : th.border}`,
            borderRadius: RADIUS.full,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: copied ? "#fff" : th.text,
            fontFamily: FONT.body,
            transition: "all 0.2s ease",
          }}
        >
          {copied ? <Check color="#fff" size={16} /> : <Copy color={th.muted} size={16} />}
          {copied ? t.hostCodeCopied : t.hostCopyCode}
        </button>
      </div>

      {qrDataUrl && (
        <div
          data-testid="host-qr-section"
          style={{
            background: th.bgCard,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.lg,
            padding: SP.lg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: SP.md,
          }}
        >
          <img
            src={qrDataUrl}
            alt="QR Code"
            style={{ width: 180, height: 180, borderRadius: RADIUS.md, background: "#fff", padding: SP.sm }}
            data-testid="host-qr-image"
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <button
            data-testid="host-qr-download-btn"
            onClick={downloadQR}
            style={{
              display: "flex",
              alignItems: "center",
              gap: SP.sm,
              padding: `${SP.sm}px ${SP.md}px`,
              minHeight: 36,
              background: th.bgHover,
              border: `1px solid ${th.border}`,
              borderRadius: RADIUS.full,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: th.text,
              fontFamily: FONT.body,
            }}
          >
            <Download color={th.muted} size={16} />
            {t.hostQrDownload}
          </button>
        </div>
      )}

      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, overflow: "hidden" }}>
        <button
          data-testid="host-email-toggle"
          onClick={() => setEmailOpen(!emailOpen)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${SP.sm}px ${SP.md}px`,
            minHeight: TOUCH_MIN,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: FONT.body,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
            <Mail color={th.gold} size={20} />
            <span style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{t.hostEmailSection}</span>
          </div>
          <ChevronDown color={th.muted} size={18} style={{ transform: emailOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>

        {emailOpen && (
          <div style={{ padding: `0 ${SP.md}px ${SP.md}px`, display: "flex", flexDirection: "column", gap: SP.sm }}>
            <textarea
              data-testid="host-email-textarea"
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              placeholder={t.hostEmailPlaceholder}
              rows={4}
              style={{
                width: "100%",
                padding: SP.sm,
                background: th.inputBg,
                border: `1px solid ${th.border}`,
                borderRadius: RADIUS.md,
                color: th.text,
                fontSize: 13,
                fontFamily: FONT.body,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <input
              data-testid="host-personal-note-input"
              type="text"
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
              placeholder={t.hostNotePlaceholder}
              style={{
                width: "100%",
                minHeight: 36,
                padding: `${SP.xs}px ${SP.sm}px`,
                background: th.inputBg,
                border: `1px solid ${th.border}`,
                borderRadius: RADIUS.md,
                color: th.text,
                fontSize: 13,
                fontFamily: FONT.body,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              data-testid="host-send-invites-btn"
              onClick={sendInvites}
              disabled={sending}
              style={{
                minHeight: TOUCH_MIN,
                background: th.gold,
                color: "#fff",
                border: "none",
                borderRadius: RADIUS.md,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: FONT.body,
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? t.hostSending : t.hostSendInvites}
            </button>

            {emailResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
                {emailResults.map((r, i) => (
                  <div
                    key={i}
                    data-testid={`host-email-result-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: `${SP.xs}px ${SP.sm}px`,
                      fontSize: 12,
                      fontFamily: FONT.body,
                      color: th.muted,
                    }}
                  >
                    <span>{r.email}</span>
                    <span style={{ color: r.emailSent ? th.green : th.amber, fontWeight: 500 }}>
                      {r.emailSent ? t.hostEmailSent : t.hostEmailQueued}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {startError && (
        <div
          style={{
            padding: SP.sm,
            background: "rgba(220,50,50,0.1)",
            borderRadius: RADIUS.md,
            color: "#e55",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
          data-testid="host-start-error"
        >
          {startError}
        </div>
      )}

      <button
        data-testid="host-start-tasting-btn"
        onClick={startTasting}
        disabled={starting}
        style={{
          width: "100%",
          minHeight: TOUCH_MIN * 1.2,
          background: th.gold,
          color: "#fff",
          border: "none",
          borderRadius: RADIUS.lg,
          fontSize: 17,
          fontWeight: 600,
          fontFamily: FONT.body,
          cursor: starting ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: SP.sm,
          transition: "transform 0.15s ease",
          opacity: starting ? 0.7 : 1,
        }}
      >
        <Play color="#fff" size={20} />
        {starting ? t.hostSending : t.hostStartTasting}
      </button>
    </div>
  );
}
