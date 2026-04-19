import { useState, useEffect } from "react";
import { Wine, Images } from "lucide-react";
import WhiskyGalleryLightbox from "./WhiskyGalleryLightbox";

const GRADIENTS = [
  ["#8B6914", "#C4A35A"],
  ["#6B4226", "#A0714F"],
  ["#5C3D2E", "#8B6B4F"],
  ["#7B6544", "#B8A07A"],
  ["#4A3728", "#7D6550"],
  ["#8B4513", "#CD853F"],
  ["#6E4B3A", "#A67B5B"],
  ["#5D4037", "#8D6E63"],
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const galleryCountCache = new Map<string, number>();

// Route remote images through our cache proxy so the browser uses one
// origin and gets a long immutable cache + WebP compression.
const REMOTE_IMAGE_HOSTS = new Set(["static.whiskybase.com"]);
function rewriteImageUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (!url.startsWith("https://")) return url;
  try {
    const parsed = new URL(url);
    if (REMOTE_IMAGE_HOSTS.has(parsed.hostname)) {
      return `/api/img-cache?u=${encodeURIComponent(url)}`;
    }
  } catch {
    return url;
  }
  return url;
}

interface WhiskyImageProps {
  imageUrl?: string | null;
  name: string;
  size?: number;
  height?: number;
  className?: string;
  testId?: string;
  whiskyId?: string;
  galleryCount?: number;
  priority?: boolean;
}

export default function WhiskyImage({ imageUrl: rawImageUrl, name, size = 44, height, className = "", testId, whiskyId, galleryCount, priority = false }: WhiskyImageProps) {
  const imageUrl = rewriteImageUrl(rawImageUrl);
  const [broken, setBroken] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [fetchedCount, setFetchedCount] = useState<number>(whiskyId ? (galleryCountCache.get(whiskyId) ?? -1) : 0);
  const h = height ?? size;
  const radius = Math.min(size, h) >= 40 ? 12 : 8;
  const iconSize = Math.max(16, Math.round(Math.min(size, h) * 0.4));
  const fontSize = Math.max(12, Math.round(Math.min(size, h) * 0.35));

  const idx = hashName(name) % GRADIENTS.length;
  const [from, to] = GRADIENTS[idx];
  const initial = (name || "?").charAt(0).toUpperCase();

  useEffect(() => {
    if (!whiskyId || !imageUrl || galleryCount !== undefined) return;
    if (galleryCountCache.has(whiskyId)) {
      setFetchedCount(galleryCountCache.get(whiskyId)!);
      return;
    }
    let cancelled = false;
    fetch(`/api/whiskies/${whiskyId}/gallery`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        const count = Math.max(0, (data.total || 0) - 1);
        galleryCountCache.set(whiskyId, count);
        setFetchedCount(count);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [whiskyId, imageUrl, galleryCount]);

  const effectiveGalleryCount = galleryCount !== undefined ? galleryCount : Math.max(0, fetchedCount);
  const hasGallery = whiskyId && imageUrl && !broken;
  const totalPhotos = effectiveGalleryCount + (imageUrl && !broken ? 1 : 0);
  const showBadge = hasGallery && totalPhotos > 1 && Math.min(size, h) >= 40;

  const handleClick = () => {
    if (hasGallery) {
      setShowGallery(true);
    }
  };

  const badge = showBadge ? (
    <div
      style={{
        position: "absolute",
        bottom: -2,
        right: -2,
        background: "var(--labs-accent, #C4A35A)",
        color: "#fff",
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        padding: "0 4px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        gap: 2,
      }}
      data-testid={testId ? `${testId}-gallery-badge` : "gallery-badge"}
    >
      <Images size={10} />
      {totalPhotos}
    </div>
  ) : null;

  const galleryOverlay = showGallery && whiskyId ? (
    <WhiskyGalleryLightbox
      whiskyId={whiskyId}
      whiskyName={name}
      currentImageUrl={imageUrl}
      onClose={() => setShowGallery(false)}
    />
  ) : null;

  if (imageUrl && !broken) {
    return (
      <>
        <div
          style={{ position: "relative", width: size, height: h, flexShrink: 0, cursor: hasGallery ? "pointer" : undefined }}
          onClick={handleClick}
          data-testid={testId}
        >
          <img
            src={imageUrl}
            alt={name}
            width={size}
            height={h}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            className={`flex-shrink-0 object-cover ${className}`}
            style={{
              width: size,
              height: h,
              borderRadius: radius,
              border: "1px solid var(--labs-border)",
              backgroundColor: "var(--labs-surface-elevated, #2a2a2a)",
            }}
            onError={() => setBroken(true)}
          />
          {badge}
        </div>
        {galleryOverlay}
      </>
    );
  }

  return (
    <>
      <div
        className={`flex-shrink-0 flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: h,
          borderRadius: radius,
          background: `linear-gradient(135deg, ${from}, ${to})`,
          border: "1px solid var(--labs-border)",
        }}
        data-testid={testId}
      >
        {Math.min(size, h) >= 32 ? (
          <span
            style={{
              fontSize,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1,
              fontFamily: "var(--labs-font-serif, Georgia, serif)",
            }}
          >
            {initial}
          </span>
        ) : (
          <Wine style={{ width: iconSize, height: iconSize, color: "rgba(255,255,255,0.7)" }} />
        )}
      </div>
      {galleryOverlay}
    </>
  );
}
