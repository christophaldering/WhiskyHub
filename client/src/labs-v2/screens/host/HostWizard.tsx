import { useState, useCallback } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Back } from "../../icons";
import type { TastingConfig, WhiskyEntry } from "../../types/host";
import HostStep1Setup from "./HostStep1Setup";
import HostStep2Whiskies from "./HostStep2Whiskies";
import HostStep3Invitations from "./HostStep3Invitations";
import HostStep4Live from "./HostStep4Live";

interface HostWizardProps {
  onBack: () => void;
}

const STEPS = [1, 2, 3, 4] as const;

export default function HostWizard({ onBack }: HostWizardProps) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();

  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<TastingConfig>({
    name: "",
    date: new Date().toISOString().slice(0, 10),
    time: "19:00",
    location: "",
    blindMode: true,
    revealOrder: ["nose", "palate", "finish", "name"],
    ratingScale: "0-100",
  });
  const [tastingId, setTastingId] = useState<string | null>(null);
  const [tastingCode, setTastingCode] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [whiskies, setWhiskies] = useState<WhiskyEntry[]>([]);

  const stepLabels = [t.hostStep1, t.hostStep2, t.hostStep3, t.hostStep4];

  const handleStep1Done = useCallback((cfg: TastingConfig, id: string, code: string, hid: string) => {
    setConfig(cfg);
    setTastingId(id);
    setTastingCode(code);
    setHostId(hid);
    setStep(2);
  }, []);

  const handleStep2Done = useCallback((ws: WhiskyEntry[]) => {
    setWhiskies(ws);
    setStep(3);
  }, []);

  const handleStep3Done = useCallback(() => {
    setStep(4);
  }, []);

  const handleBackFromStep = useCallback(() => {
    if (step > 1) setStep(step - 1);
    else onBack();
  }, [step, onBack]);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: `${SP.md}px ${SP.md}px ${SP.sm}px`,
          gap: SP.sm,
        }}
      >
        <button
          onClick={step === 1 ? onBack : handleBackFromStep}
          data-testid="host-back-btn"
          style={{
            minWidth: TOUCH_MIN,
            minHeight: TOUCH_MIN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Back color={th.text} size={24} />
        </button>
        <span
          style={{
            fontFamily: FONT.display,
            fontSize: 20,
            fontWeight: 600,
            color: th.text,
            flex: 1,
          }}
          data-testid="host-title"
        >
          {t.hostTitle}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.xs,
          padding: `0 ${SP.md}px ${SP.md}px`,
        }}
        data-testid="host-stepper"
      >
        {STEPS.map((s, i) => {
          const isActive = s === step;
          const isDone = s < step;
          return (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  height: 3,
                  borderRadius: RADIUS.full,
                  background: isDone ? th.gold : isActive ? th.gold : th.border,
                  opacity: isActive ? 1 : isDone ? 0.7 : 0.3,
                  transition: "all 0.3s ease",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? th.gold : isDone ? th.muted : th.faint,
                  textAlign: "center",
                  fontFamily: FONT.body,
                  transition: "color 0.3s ease",
                }}
              >
                {stepLabels[i]}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: `0 ${SP.md}px ${SP.lg}px` }}>
        {step === 1 && (
          <HostStep1Setup
            th={th}
            t={t}
            config={config}
            onDone={handleStep1Done}
          />
        )}
        {step === 2 && tastingId && (
          <HostStep2Whiskies
            th={th}
            t={t}
            tastingId={tastingId}
            blindMode={config.blindMode}
            whiskies={whiskies}
            onWhiskiesChange={setWhiskies}
            onDone={handleStep2Done}
          />
        )}
        {step === 3 && tastingId && tastingCode && (
          <HostStep3Invitations
            th={th}
            t={t}
            tastingId={tastingId}
            tastingCode={tastingCode}
            hostId={hostId || ""}
            onDone={handleStep3Done}
          />
        )}
        {step === 4 && tastingId && (
          <HostStep4Live
            th={th}
            t={t}
            tastingId={tastingId}
            hostId={hostId || ""}
            whiskies={whiskies}
            onBack={onBack}
          />
        )}
      </div>
    </div>
  );
}
