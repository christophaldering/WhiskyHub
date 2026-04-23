import { useEffect, useRef, useState } from "react";

interface CoverImage16x9Props {
  src: string | null | undefined;
  alt?: string;
  rounded?: number | string;
  className?: string;
  testId?: string;
  /** Renders only the blurred portrait letterbox background as a full overlay (for slide bg) */
  asBackdrop?: boolean;
  /** Optional opacity for backdrop usage (0..1) */
  backdropOpacity?: number;
  /** Optional saturation multiplier for backdrop usage */
  backdropSaturate?: number;
  /** Optional max blur in px for the backdrop or letterbox (default 16) */
  backdropBlur?: number;
}

/**
 * Consistent 16:9 cover renderer:
 * - Landscape / square images: cover-fit fills the frame.
 * - Portrait images: scaled to fit (contain) with a blurred copy of the same image as letterbox background.
 *
 * In `asBackdrop` mode it renders only the blurred image as a positioned absolute overlay
 * (intended for use behind hero/title slides).
 */
export default function CoverImage16x9({
  src,
  alt = "",
  rounded = 12,
  className,
  testId,
  asBackdrop = false,
  backdropOpacity = 0.18,
  backdropSaturate = 0.7,
  backdropBlur = 16,
}: CoverImage16x9Props) {
  const [aspect, setAspect] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setAspect(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
  }, [src]);

  if (!src) return null;

  const isPortrait = aspect !== null && aspect < 1;

  if (asBackdrop) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: backdropOpacity,
          filter: `blur(${backdropBlur / 2}px) saturate(${backdropSaturate})`,
        }}
        data-testid={testId}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: typeof rounded === "number" ? `${rounded}px` : rounded,
        overflow: "hidden",
        background: "var(--labs-surface, #1a1714)",
      }}
      data-testid={testId}
    >
      {isPortrait && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: `blur(${backdropBlur}px) saturate(${backdropSaturate})`,
            transform: "scale(1.15)",
            opacity: 0.85,
          }}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: isPortrait ? "contain" : "cover",
          objectPosition: "center",
        }}
        draggable={false}
      />
    </div>
  );
}
