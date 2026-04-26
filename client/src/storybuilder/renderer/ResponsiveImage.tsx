import type { CSSProperties } from "react";
import { safeUrl } from "../editor/RichTextEditor";

type Props = {
  src: string;
  alt: string;
  eager?: boolean;
  sizes?: string;
  style?: CSSProperties;
  className?: string;
  testId?: string;
  fetchPriority?: "high" | "low" | "auto";
  onLoad?: () => void;
};

const DEFAULT_SIZES = "(max-width: 600px) 92vw, (max-width: 1100px) 80vw, 1100px";
const SRCSET_WIDTHS = [320, 480, 640, 960, 1280, 1600];

function isObjectStorageUrl(safeAbsUrl: string): boolean {
  try {
    const u = new URL(safeAbsUrl, window.location.origin);
    return u.pathname.startsWith("/objects/") || u.pathname.startsWith("/api/uploads/serve/objects/");
  } catch {
    return false;
  }
}

function withWidth(safeAbsUrl: string, w: number): string {
  try {
    const u = new URL(safeAbsUrl, window.location.origin);
    u.searchParams.set("w", String(w));
    return u.pathname + u.search + u.hash;
  } catch {
    return safeAbsUrl;
  }
}

function buildSrcSet(safeAbsUrl: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  if (!isObjectStorageUrl(safeAbsUrl)) return undefined;
  return SRCSET_WIDTHS.map((w) => `${withWidth(safeAbsUrl, w)} ${w}w`).join(", ");
}

export function ResponsiveImage({
  src,
  alt,
  eager,
  sizes,
  style,
  className,
  testId,
  fetchPriority,
  onLoad,
}: Props) {
  const safe = safeUrl(src);
  if (!safe) return null;
  const loading: "lazy" | "eager" = eager ? "eager" : "lazy";
  const decoding: "async" | "sync" = eager ? "sync" : "async";
  const priority = fetchPriority ?? (eager ? "high" : "auto");
  const srcSet = buildSrcSet(safe);
  return (
    <img
      src={safe}
      srcSet={srcSet}
      alt={alt}
      loading={loading}
      decoding={decoding}
      sizes={sizes ?? DEFAULT_SIZES}
      fetchPriority={priority}
      className={className}
      style={style}
      onLoad={onLoad}
      data-testid={testId}
    />
  );
}
