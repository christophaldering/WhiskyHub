import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { tastingPhotoApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, Trash2, X, Printer, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useInputFocused } from "@/hooks/use-input-focused";
import type { TastingPhoto, Whisky } from "@shared/schema";

interface TastingPhotosProps {
  tastingId: string;
  isHost: boolean;
  whiskies?: Whisky[];
}

export default function TastingPhotos({ tastingId, isHost, whiskies = [] }: TastingPhotosProps) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<TastingPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputFocused = useInputFocused();
  const { data: photos = [] } = useQuery<TastingPhoto[]>({
    queryKey: ["tasting-photos", tastingId],
    queryFn: () => tastingPhotoApi.getAll(tastingId),
    refetchInterval: inputFocused ? false : 15000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentParticipant) throw new Error("Not logged in");
      return tastingPhotoApi.upload(
        tastingId,
        file,
        currentParticipant.id,
        currentParticipant.name,
        undefined,
        caption || undefined
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting-photos", tastingId] });
      setCaption("");
    },
  });

  const togglePrintableMutation = useMutation({
    mutationFn: ({ photoId, printable }: { photoId: string; printable: boolean }) => {
      if (!currentParticipant) throw new Error("Not logged in");
      return tastingPhotoApi.update(photoId, currentParticipant.id, { printable });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting-photos", tastingId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => {
      if (!currentParticipant) throw new Error("Not logged in");
      return tastingPhotoApi.delete(photoId, currentParticipant.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting-photos", tastingId] });
      setLightboxPhoto(null);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const navigateLightbox = (direction: number) => {
    if (!lightboxPhoto) return;
    const idx = photos.findIndex((p) => p.id === lightboxPhoto.id);
    const next = photos[idx + direction];
    if (next) setLightboxPhoto(next);
  };

  const isOwner = (photo: TastingPhoto) => currentParticipant?.id === photo.participantId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-serif font-bold text-primary flex items-center gap-2">
          <Camera className="w-5 h-5" />
          {t("session.photos.title", "Photos")}
          {photos.length > 0 && <span className="text-sm font-normal text-muted-foreground">({photos.length})</span>}
        </h3>
      </div>

      {currentParticipant && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-photo-upload"
          />
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t("session.photos.captionPlaceholder", "Add a caption...")}
            className="max-w-xs bg-secondary/20 text-sm"
            data-testid="input-photo-caption"
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1"
            data-testid="button-upload-photo"
          >
            <Upload className="w-4 h-4" />
            {uploading ? t("session.photos.uploading", "Uploading...") : t("session.photos.upload", "Upload Photo")}
          </Button>
        </div>
      )}

      {photos.length === 0 && (
        <p className="text-sm text-muted-foreground italic">{t("session.photos.empty", "No photos yet. Be the first to capture a moment!")}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative rounded-lg overflow-hidden border bg-card shadow-sm" data-testid={`card-photo-${photo.id}`}>
            <img
              src={photo.photoUrl}
              alt={photo.caption || "Tasting photo"}
              className="w-full aspect-square object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxPhoto(photo)}
              loading="lazy"
            />
            <div className="p-2 space-y-1">
              {photo.caption && <p className="text-xs font-medium truncate">{photo.caption}</p>}
              <p className="text-xs text-muted-foreground">{photo.participantName || t("session.photos.anonymous", "Anonymous")}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {photo.printable ? (
                    <Printer className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                  <span>{photo.printable ? t("session.photos.printable", "Printable") : t("session.photos.screenOnly", "Screen only")}</span>
                </div>
                {(isOwner(photo) || isHost) && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePrintableMutation.mutate({ photoId: photo.id, printable: !photo.printable })}
                      className="text-xs text-muted-foreground hover:text-foreground p-1"
                      title={photo.printable ? t("session.photos.makeScreenOnly", "Make screen only") : t("session.photos.makePrintable", "Make printable")}
                      data-testid={`button-toggle-printable-${photo.id}`}
                    >
                      {photo.printable ? <Eye className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
                    </button>
                    {isOwner(photo) && (
                      <button
                        onClick={() => deleteMutation.mutate(photo.id)}
                        className="text-xs text-destructive/60 hover:text-destructive p-1"
                        title={t("session.photos.delete", "Delete")}
                        data-testid={`button-delete-photo-${photo.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!lightboxPhoto} onOpenChange={(open) => !open && setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {lightboxPhoto && (
            <div className="relative">
              <img
                src={lightboxPhoto.photoUrl}
                alt={lightboxPhoto.caption || "Photo"}
                className="w-full max-h-[80vh] object-contain bg-black"
              />
              <div className="absolute top-2 right-2">
                <Button variant="ghost" size="icon" onClick={() => setLightboxPhoto(null)} className="text-white bg-black/50 hover:bg-black/70" data-testid="button-close-lightbox">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              {photos.findIndex((p) => p.id === lightboxPhoto.id) > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateLightbox(-1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70"
                  data-testid="button-lightbox-prev"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              )}
              {photos.findIndex((p) => p.id === lightboxPhoto.id) < photos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateLightbox(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70"
                  data-testid="button-lightbox-next"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              )}
              <div className="bg-background p-4 space-y-1">
                {lightboxPhoto.caption && <p className="font-medium">{lightboxPhoto.caption}</p>}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{lightboxPhoto.participantName || t("session.photos.anonymous", "Anonymous")}</span>
                  <span>•</span>
                  <span>{new Date(lightboxPhoto.createdAt!).toLocaleString()}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {lightboxPhoto.printable ? <Printer className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {lightboxPhoto.printable ? t("session.photos.printable", "Printable") : t("session.photos.screenOnly", "Screen only")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
