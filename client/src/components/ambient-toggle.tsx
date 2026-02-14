import { useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";
import { playSoundscape, stopSoundscape, setVolume, type Soundscape } from "@/lib/ambient";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const soundscapeIcons: Record<Soundscape, string> = {
  fireplace: "\uD83D\uDD25",
  rain: "\uD83C\uDF27",
  night: "\uD83C\uDF19",
};

export function AmbientToggle({ variant = "default" }: { variant?: "default" | "intro" }) {
  const { t } = useTranslation();
  const {
    ambientPlaying,
    ambientSoundscape,
    ambientVolume,
    setAmbientPlaying,
    setAmbientSoundscape,
    setAmbientVolume,
  } = useAppStore();

  const start = useCallback((soundscape: Soundscape, vol: number) => {
    playSoundscape(soundscape);
    setVolume(vol);
    setAmbientPlaying(true);
    setAmbientSoundscape(soundscape);
  }, [setAmbientPlaying, setAmbientSoundscape]);

  const stop = useCallback(() => {
    stopSoundscape();
    setAmbientPlaying(false);
  }, [setAmbientPlaying]);

  const togglePlay = () => {
    if (ambientPlaying) {
      stop();
    } else {
      start(ambientSoundscape, ambientVolume);
    }
  };

  const selectSoundscape = (s: Soundscape) => {
    setAmbientSoundscape(s);
    if (ambientPlaying) {
      start(s, ambientVolume);
    }
  };

  const handleVolume = (val: number[]) => {
    const vol = val[0];
    setAmbientVolume(vol);
    setVolume(vol);
  };

  if (variant === "intro") {
    return (
      <button
        onClick={togglePlay}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-sm border transition-all duration-300 text-sm font-serif",
          ambientPlaying
            ? "border-amber-500/60 text-amber-200 bg-amber-500/10"
            : "border-white/20 text-white/50 hover:text-white/70 hover:border-white/40"
        )}
        data-testid="button-ambient-intro"
      >
        {ambientPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        {ambientPlaying
          ? `${soundscapeIcons[ambientSoundscape]} ${t(`ambient.${ambientSoundscape}`)}`
          : t("ambient.enable")
        }
      </button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "font-mono text-xs tracking-wider border border-border/50 hover:bg-secondary/50 gap-1.5",
            ambientPlaying && "text-primary border-primary/40"
          )}
          data-testid="button-ambient-toggle"
        >
          {ambientPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          {ambientPlaying && <span className="text-[10px]">{soundscapeIcons[ambientSoundscape]}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-4 space-y-4" align="start" data-testid="ambient-popover">
        <div className="space-y-2">
          <p className="text-xs font-serif text-muted-foreground uppercase tracking-wider">
            {t("ambient.title")}
          </p>
          <div className="flex gap-1.5">
            {(["fireplace", "rain", "night"] as Soundscape[]).map((s) => (
              <button
                key={s}
                onClick={() => selectSoundscape(s)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-sm border text-xs transition-all",
                  ambientSoundscape === s
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                )}
                data-testid={`button-ambient-${s}`}
              >
                <span className="text-base">{soundscapeIcons[s]}</span>
                <span className="font-serif">{t(`ambient.${s}`)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-serif text-muted-foreground">{t("ambient.volume")}</p>
          <Slider
            value={[ambientVolume]}
            onValueChange={handleVolume}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
            data-testid="slider-ambient-volume"
          />
        </div>

        <Button
          variant={ambientPlaying ? "secondary" : "default"}
          size="sm"
          className="w-full text-xs font-serif"
          onClick={togglePlay}
          data-testid="button-ambient-play"
        >
          {ambientPlaying ? t("ambient.stop") : t("ambient.play")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
