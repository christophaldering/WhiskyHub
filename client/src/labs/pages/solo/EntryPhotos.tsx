import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, X, MapPin } from "lucide-react";

interface EntryPhoto {
  id: string;
  photoUrl: string;
  sortOrder: number;
}

interface Props {
  participantId: string;
  entryId: string;
}

const MAX_PHOTOS = 5;

/**
 * Memory photos for a completed solo journal entry.
 * Up to 5 photos; GPS/EXIF is stripped server-side by the universal sanitizer.
 * All requests carry the x-participant-id header (the photo routes verify caller + ownership).
 */
export default function EntryPhotos({ participantId, entryId }: Props) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<EntryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const authHeaders = { "x-participant-id": participantId };

  const load = async () => {
    try {
      const res = await fetch(`/api/journal/${participantId}/${entryId}/photos`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setPhotos(Array.isArray(data) ? data : []);
      }
    } catch {
      /* keep current list on transient error */
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId, entryId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const remaining = MAX_PHOTOS - photos.length;
    const toUpload = Array.from(files).slice(0, Math.max(0, remaining));
    if (toUpload.length === 0) return;
    setUploading(true);
    for (const file of toUpload) {
      try {
        const form = new FormData();
        form.append("photo", file);
        const res = await fetch(`/api/journal/${participantId}/${entryId}/photos`, {
          method: "POST",
          headers: authHeaders,
          body: form,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.message || t("v2.solo.photosError", "Foto konnte nicht hinzugef\u00fcgt werden."));
        }
      } catch {
        setError(t("v2.solo.photosError", "Foto konnte nicht hinzugef\u00fcgt werden."));
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    await load();
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/journal/${participantId}/photos/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* leave list unchanged on error */
    }
  };

  const full = photos.length >= MAX_PHOTOS;

  return (
    <div
      style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}
      data-testid="entry-photos"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
          {t("v2.solo.photosTitle", "Erinnerungsfotos")}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--labs-text-muted)" }}>
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      {photos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {photos.map((p) => (
            <div
              key={p.id}
              style={{
                position: "relative",
                width: 72,
                height: 72,
                borderRadius: "var(--labs-radius)",
                overflow: "hidden",
                background: "var(--labs-input-bg)",
              }}
            >
              <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => handleDelete(p.id)}
                aria-label={t("v2.solo.photoDelete", "Foto entfernen")}
                data-testid="entry-photo-delete"
                style={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(11,9,6,0.72)",
                  color: "#F5EDE0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!full && (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="labs-btn-secondary"
          data-testid="entry-photos-add"
          style={{
            width: "100%",
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: uploading ? 0.7 : 1,
          }}
        >
          <ImagePlus size={16} />
          <span>{uploading ? t("v2.solo.photosUploading", "L\u00e4dt \u2026") : t("v2.solo.photosAdd", "Foto hinzuf\u00fcgen")}</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: "none" }}
      />

      <p
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--labs-text-muted)",
          margin: 0,
        }}
        data-testid="entry-photos-location-hint"
      >
        <MapPin size={11} style={{ flexShrink: 0 }} />
        {t("v2.solo.photosLocationHint", "Standortdaten werden zum Schutz automatisch entfernt.")}
      </p>

      {error && (
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--labs-danger)", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
