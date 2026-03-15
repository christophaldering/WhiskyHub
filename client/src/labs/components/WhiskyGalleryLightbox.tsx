import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryPhoto {
  url: string;
  source: string;
  isCurrent: boolean;
  createdAt: string | null;
}

interface WhiskyGalleryLightboxProps {
  whiskyId: string;
  whiskyName: string;
  currentImageUrl?: string | null;
  onClose: () => void;
}

export default function WhiskyGalleryLightbox({ whiskyId, whiskyName, currentImageUrl, onClose }: WhiskyGalleryLightboxProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await fetch(`/api/whiskies/${whiskyId}/gallery`);
        if (res.ok) {
          const data = await res.json();
          setPhotos(data.photos || []);
        } else if (currentImageUrl) {
          setPhotos([{ url: currentImageUrl, source: "current", isCurrent: true, createdAt: null }]);
        }
      } catch {
        if (currentImageUrl) {
          setPhotos([{ url: currentImageUrl, source: "current", isCurrent: true, createdAt: null }]);
        }
      }
      setLoading(false);
    };
    fetchGallery();
  }, [whiskyId, currentImageUrl]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    if (!loading && photos.length === 0) {
      onClose();
    }
  }, [loading, photos.length, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > 50) {
      if (touchDeltaX.current < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (loading) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={onClose}
        data-testid="gallery-lightbox-loading"
      >
        <div style={{ color: "#fff", fontSize: 16 }}>Loading…</div>
      </div>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  const current = photos[currentIndex];
  const showNav = photos.length > 1;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
      onClick={handleBackdropClick}
      data-testid="gallery-lightbox"
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 10001,
          background: "rgba(255,255,255,0.15)", border: "none",
          borderRadius: "50%", width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#fff",
        }}
        data-testid="gallery-close-btn"
      >
        <X size={22} />
      </button>

      <div
        style={{
          position: "relative",
          width: "100%", maxWidth: 600,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 48px",
          boxSizing: "border-box",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {showNav && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            style={{
              position: "absolute", left: 4, zIndex: 10001,
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: "50%", width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
            }}
            data-testid="gallery-prev-btn"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <img
          src={current.url}
          alt={whiskyName}
          style={{
            maxWidth: "100%", maxHeight: "75vh",
            borderRadius: 12,
            objectFit: "contain",
          }}
          onClick={(e) => e.stopPropagation()}
          data-testid="gallery-current-photo"
        />

        {showNav && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            style={{
              position: "absolute", right: 4, zIndex: 10001,
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: "50%", width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
            }}
            data-testid="gallery-next-btn"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {showNav && (
        <div
          style={{
            display: "flex", gap: 6, marginTop: 16,
            alignItems: "center", justifyContent: "center",
          }}
          data-testid="gallery-dots"
        >
          {photos.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              style={{
                width: idx === currentIndex ? 10 : 7,
                height: idx === currentIndex ? 10 : 7,
                borderRadius: "50%",
                background: idx === currentIndex ? "#fff" : "rgba(255,255,255,0.4)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.2s",
              }}
              data-testid={`gallery-dot-${idx}`}
            />
          ))}
        </div>
      )}

      {showNav && (
        <div
          style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 8 }}
          data-testid="gallery-counter"
        >
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
