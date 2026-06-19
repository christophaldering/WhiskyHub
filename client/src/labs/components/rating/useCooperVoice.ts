import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCooperVoice } from "./impressionApi";

export function useCooperVoice() {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const levelRef = useRef(0);

  const stopRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stop = useCallback(() => {
    stopRaf();
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    levelRef.current = 0;
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    stop();
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current!;
      if (ctx.state === "suspended") { try { await ctx.resume(); } catch {} }
      const ab = await fetchCooperVoice(trimmed);
      const audioBuffer = await ctx.decodeAudioData(ab);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceRef.current = source;
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (sourceRef.current !== source) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        levelRef.current = Math.min(1, Math.sqrt(sum / data.length) * 2);
        rafRef.current = requestAnimationFrame(tick);
      };
      source.onended = () => {
        if (sourceRef.current === source) {
          stopRaf();
          levelRef.current = 0;
          sourceRef.current = null;
          setSpeaking(false);
        }
      };
      setSpeaking(true);
      source.start();
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Stimme ist additiv — bei Ausfall bleibt der Text lesbar.
      stop();
    }
  }, [stop]);

  useEffect(() => () => {
    stop();
    if (ctxRef.current) { try { ctxRef.current.close(); } catch {} ctxRef.current = null; }
  }, [stop]);

  return { speak, speaking, levelRef, stop };
}
