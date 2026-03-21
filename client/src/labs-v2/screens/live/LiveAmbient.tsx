import { useState, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Sound, SoundOff, Flame, Music, ChevronDown } from "../../icons";
import { playSoundscape, stopSoundscape, setVolume, getState, type Soundscape } from "@/lib/ambient";

interface LiveAmbientProps {
  th: ThemeTokens;
  t: Translations;
}

const SOUNDSCAPES: { id: Soundscape; icon: "flame" | "rain" | "night" | "music"; labelKey: keyof import("../../i18n").Translations }[] = [
  { id: "fireplace", icon: "flame", labelKey: "liveFireplace" },
  { id: "rain", icon: "rain", labelKey: "liveRain" },
  { id: "night", icon: "night", labelKey: "liveNight" },
  { id: "bagpipe", icon: "music", labelKey: "liveBagpipe" },
];

function SoundscapeIcon({ type, color, size }: { type: string; color: string; size: number }) {
  if (type === "flame") return <Flame color={color} size={size} />;
  if (type === "music") return <Music color={color} size={size} />;
  return <Sound color={color} size={size} />;
}

export default function LiveAmbient({ th, t }: LiveAmbientProps) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<Soundscape | null>(() => getState().activeSoundscape);
  const [vol, setVol] = useState(0.3);

  useEffect(() => {
    return () => {
      stopSoundscape();
    };
  }, []);

  const handleSelect = (id: Soundscape) => {
    if (active === id) {
      stopSoundscape();
      setActive(null);
    } else {
      playSoundscape(id);
      setActive(id);
    }
  };

  const handleOff = () => {
    stopSoundscape();
    setActive(null);
  };

  const handleVolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    setVolume(v);
  };

  return (
    <div
      style={{
        background: th.bgCard,
        borderRadius: RADIUS.md,
        border: `1px solid ${th.border}`,
        overflow: "hidden",
      }}
      data-testid="live-ambient"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.sm,
          width: "100%",
          padding: `${SP.md}px`,
          background: "none",
          border: "none",
          color: th.text,
          cursor: "pointer",
          fontFamily: FONT.body,
          fontSize: 14,
          fontWeight: 500,
          minHeight: TOUCH_MIN,
        }}
        data-testid="live-ambient-toggle"
      >
        {active ? <Sound color={th.gold} size={18} /> : <SoundOff color={th.muted} size={18} />}
        <span style={{ flex: 1, textAlign: "left" }}>{t.liveAmbient}</span>
        {active && (
          <span style={{ fontSize: 12, color: th.gold }}>
            {t[SOUNDSCAPES.find((s) => s.id === active)?.labelKey || "liveAmbientOff"]}
          </span>
        )}
        <ChevronDown
          color={th.muted}
          size={16}
          style={{
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {expanded && (
        <div style={{ padding: `0 ${SP.md}px ${SP.md}px` }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: SP.sm, marginBottom: SP.md }}>
            <button
              onClick={handleOff}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: SP.xs,
                padding: `${SP.sm}px`,
                background: !active ? th.bgHover : "transparent",
                border: `1px solid ${!active ? th.gold : th.border}`,
                borderRadius: RADIUS.sm,
                color: !active ? th.gold : th.muted,
                cursor: "pointer",
                fontFamily: FONT.body,
                fontSize: 10,
                minHeight: TOUCH_MIN,
              }}
              data-testid="live-ambient-off"
            >
              <SoundOff color={!active ? th.gold : th.muted} size={18} />
              {t.liveAmbientOff}
            </button>
            {SOUNDSCAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: SP.xs,
                  padding: `${SP.sm}px`,
                  background: active === s.id ? th.bgHover : "transparent",
                  border: `1px solid ${active === s.id ? th.gold : th.border}`,
                  borderRadius: RADIUS.sm,
                  color: active === s.id ? th.gold : th.muted,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 10,
                  minHeight: TOUCH_MIN,
                }}
                data-testid={`live-ambient-${s.id}`}
              >
                <SoundscapeIcon type={s.icon} color={active === s.id ? th.gold : th.muted} size={18} />
                {t[s.labelKey]}
              </button>
            ))}
          </div>

          {active && (
            <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
              <span style={{ fontFamily: FONT.body, fontSize: 11, color: th.muted, flexShrink: 0 }}>
                {t.liveVolume}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                onChange={handleVolChange}
                style={{ flex: 1, accentColor: th.gold }}
                data-testid="live-ambient-volume"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
