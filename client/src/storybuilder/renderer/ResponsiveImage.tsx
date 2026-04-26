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
  return (
    <img
      src={safe}
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
