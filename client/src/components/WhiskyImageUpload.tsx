import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Camera, X, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { whiskyApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { compressImage, isAcceptedImageType, fileTooLargeAfterCompression, IMAGE_ACCEPT_STRING } from "@/lib/image-compress";

interface WhiskyImageUploadProps {
  whiskyId?: string;
  tastingId?: string;
  imageUrl?: string | null;
  onFileSelected?: (file: File) => void;
  onImageUploaded?: (url: string) => void;
  onImageDeleted?: () => void;
  canDelete?: boolean;
  variant?: "labs" | "default";
  size?: "sm" | "md";
  testIdPrefix?: string;
}

export default function WhiskyImageUpload({
  whiskyId,
  tastingId,
  imageUrl,
  onFileSelected,
  onImageUploaded,
  onImageDeleted,
  canDelete = true,
  variant = "labs",
  size = "md",
  testIdPrefix = "whisky-image",
}: WhiskyImageUploadProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => whiskyApi.uploadImage(whiskyId!, file),
    onSuccess: (data: any) => {
      if (tastingId) {
        queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      }
      onImageUploaded?.(data.imageUrl || "");
    },
    onError: () => {
      toast({ title: t("common.uploadFailed", "Upload failed"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => whiskyApi.deleteImage(whiskyId!),
    onSuccess: () => {
      setLocalPreview(null);
      if (tastingId) {
        queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      }
      onImageDeleted?.();
    },
    onError: () => {
      toast({ title: t("common.deleteFailed", "Delete failed"), variant: "destructive" });
    },
  });

  const [compressing, setCompressing] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAcceptedImageType(file)) {
      toast({ title: "Nur JPEG, PNG, WebP, GIF oder HEIC erlaubt.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      if (fileTooLargeAfterCompression(compressed)) {
        toast({ title: "Das Bild ist auch nach Komprimierung zu groß (max. 20 MB).", variant: "destructive" });
        e.target.value = "";
        return;
      }
      const previewUrl = URL.createObjectURL(compressed);
      setLocalPreview(previewUrl);
      if (onFileSelected) {
        onFileSelected(compressed);
      } else if (whiskyId) {
        uploadMutation.mutate(compressed);
      }
    } catch {
      toast({ title: "Bild konnte nicht verarbeitet werden. Bitte versuche ein anderes Format.", variant: "destructive" });
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  }, [onFileSelected, whiskyId, uploadMutation, toast]);

  const handleDelete = useCallback(() => {
    setLocalPreview(null);
    if (whiskyId) {
      deleteMutation.mutate();
    } else {
      onImageDeleted?.();
    }
  }, [whiskyId, deleteMutation, onImageDeleted]);

  const isUploading = uploadMutation.isPending || compressing;
  const isDeleting = deleteMutation.isPending;
  const displayUrl = localPreview || imageUrl;
  const dims = size === "sm" ? { w: 72, h: 96 } : { w: 128, h: 128 };

  if (variant === "labs") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {displayUrl ? (
          <div style={{ position: "relative", width: dims.w, height: dims.h, borderRadius: 10, overflow: "hidden", border: "1px solid var(--labs-border)", flexShrink: 0 }}>
            <img src={displayUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} data-testid={`${testIdPrefix}-preview`} />
            {isUploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#fff" }} />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{ position: "absolute", bottom: 4, right: canDelete ? 32 : 4, width: 28, height: 28, borderRadius: "50%", background: "var(--labs-accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              data-testid={`${testIdPrefix}-replace-btn`}
            >
              <Camera className="w-3.5 h-3.5" style={{ color: "var(--labs-bg)" }} />
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ position: "absolute", bottom: 4, right: 4, width: 28, height: 28, borderRadius: "50%", background: "var(--labs-danger, #e74c3c)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                data-testid={`${testIdPrefix}-delete-btn`}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#fff" }} /> : <X className="w-3.5 h-3.5" style={{ color: "#fff" }} />}
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{ width: dims.w, height: dims.h, borderRadius: 10, border: "2px dashed var(--labs-border)", background: "var(--labs-accent-muted)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0 }}
            data-testid={`${testIdPrefix}-add-btn`}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--labs-accent)", opacity: 0.75 }} />
            ) : (
              <Camera className="w-5 h-5" style={{ color: "var(--labs-accent)", opacity: 0.75 }} />
            )}
            <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{t("whisky.uploadPhoto", "Add Photo")}</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT_STRING}
          onChange={handleFileChange}
          style={{ display: "none" }}
          data-testid={`${testIdPrefix}-input`}
        />
        <p style={{ fontSize: 10, color: "var(--labs-text-muted)", opacity: 0.6, textAlign: "center", margin: 0 }}>
          {t("common.uploadHint", "JPEG/PNG/WebP/HEIC – Bilder werden automatisch komprimiert.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {displayUrl ? (
        <div className="flex justify-center">
          <div className="relative">
            <img src={displayUrl} alt="" className="max-h-64 rounded-lg border border-border/50 object-contain" data-testid={`${testIdPrefix}-preview`} />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="absolute top-2 right-2 w-7 h-7 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive transition-colors shadow-md"
                data-testid={`${testIdPrefix}-delete-btn`}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <div
            className="rounded-lg bg-secondary/20 border border-dashed border-border flex items-center justify-center cursor-pointer"
            style={{ width: dims.w, height: dims.h }}
            onClick={() => fileInputRef.current?.click()}
            data-testid={`${testIdPrefix}-add-btn`}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-muted-foreground/40 animate-spin" />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground/40" />
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT_STRING}
          onChange={handleFileChange}
          className="hidden"
          data-testid={`${testIdPrefix}-input`}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs font-serif inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-secondary/50 transition-colors"
          data-testid={`${testIdPrefix}-upload-btn`}
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Camera className="w-3.5 h-3.5" />
          )}
          {displayUrl ? t("whisky.replacePhoto", "Replace Photo") : t("whisky.uploadPhoto", "Upload Photo")}
        </button>
        <p className="text-[10px] text-muted-foreground/60">{t("common.uploadHint", "JPEG/PNG/WebP/HEIC – Bilder werden automatisch komprimiert.")}</p>
      </div>
    </div>
  );
}
