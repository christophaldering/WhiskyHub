import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Search, Trash2, Globe, Lock, Image as ImageIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import ModalPortal from "@/labs/components/ModalPortal";

type AiImage = {
  id: string;
  ownerId: string;
  imageUrl: string;
  mimeType: string;
  prompt: string;
  promptHint: string | null;
  sourceContext: string;
  tastingId: string | null;
  tags: string[];
  visibility: "private" | "community";
  createdAt: string;
};

type Scope = "mine" | "community";

export default function LabsAiImages() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id || "";
  const [scope, setScope] = useState<Scope>("mine");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AiImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AiImage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ scope, ...(debouncedSearch ? { q: debouncedSearch } : {}) });
    fetch(`/api/ai-images?${params.toString()}`, { headers: { "x-participant-id": pid } })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { if (!cancelled) setItems(data.items || []); })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scope, debouncedSearch, pid]);

  const reload = () => setSearch((s) => s);

  const handleToggleVisibility = async (img: AiImage) => {
    if (!pid || img.ownerId !== pid) return;
    setBusyId(img.id);
    const next = img.visibility === "community" ? "private" : "community";
    try {
      const r = await fetch(`/api/ai-images/${img.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-participant-id": pid },
        body: JSON.stringify({ visibility: next }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Failed");
      setItems((rows) => {
        if (scope === "community" && next === "private") {
          return rows.filter((it) => it.id !== img.id);
        }
        return rows.map((it) => (it.id === img.id ? { ...it, visibility: next } : it));
      });
      if (detail?.id === img.id) {
        if (scope === "community" && next === "private") setDetail(null);
        else setDetail({ ...img, visibility: next });
      }
    } catch (e: any) {
      setError(e.message || "Failed to update");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (img: AiImage) => {
    if (!pid || img.ownerId !== pid) return;
    if (!window.confirm(t("labs.aiImages.deleteConfirm"))) return;
    setBusyId(img.id);
    try {
      const r = await fetch(`/api/ai-images/${img.id}`, {
        method: "DELETE",
        headers: { "x-participant-id": pid },
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Failed");
      setItems((rows) => rows.filter((it) => it.id !== img.id));
      if (detail?.id === img.id) setDetail(null);
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    } finally {
      setBusyId(null);
    }
  };

  if (!pid) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <p style={{ color: "var(--labs-text-muted)" }}>{t("labs.aiImages.signInRequired")}</p>
      </div>
    );
  }

  return (
    <div className="labs-page" style={{ padding: "16px 16px 80px", maxWidth: 1200, margin: "0 auto" }}>
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-serif text-xl font-semibold" style={{ color: "var(--labs-text)" }}>
          {t("labs.aiImages.title")}
        </h1>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--labs-text-muted)" }}>
        {t("labs.aiImages.subtitle")}
      </p>

      <div className="flex gap-2 mb-3" role="tablist">
        <button
          role="tab"
          aria-selected={scope === "mine"}
          onClick={() => setScope("mine")}
          className={scope === "mine" ? "labs-btn-primary text-sm px-3 py-1.5" : "labs-btn-secondary text-sm px-3 py-1.5"}
          data-testid="tab-ai-images-mine"
        >
          {t("labs.aiImages.tabMine")}
        </button>
        <button
          role="tab"
          aria-selected={scope === "community"}
          onClick={() => setScope("community")}
          className={scope === "community" ? "labs-btn-primary text-sm px-3 py-1.5" : "labs-btn-secondary text-sm px-3 py-1.5"}
          data-testid="tab-ai-images-community"
        >
          {t("labs.aiImages.tabCommunity")}
        </button>
      </div>

      <div className="relative mb-4" style={{ maxWidth: 480 }}>
        <Search className="w-4 h-4 absolute" style={{ left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)", pointerEvents: "none" }} />
        <input
          className="labs-input w-full"
          style={{ paddingLeft: 32 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("labs.aiImages.searchPlaceholder")}
          data-testid="input-ai-images-search"
        />
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--labs-error, #ef4444)" }} data-testid="text-ai-images-error">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--labs-accent)" }} />
        </div>
      ) : items.length === 0 ? (
        <div className="labs-empty" style={{ padding: "40px 16px", textAlign: "center" }}>
          <p style={{ color: "var(--labs-text-muted)" }}>
            {scope === "mine" ? t("labs.aiImages.emptyMine") : t("labs.aiImages.emptyCommunity")}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {items.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setDetail(img)}
              className="text-left rounded-lg overflow-hidden"
              style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)", padding: 0, cursor: "pointer" }}
              data-testid={`card-ai-image-${img.id}`}
            >
              <div style={{ aspectRatio: "16/9", background: "var(--labs-surface-elevated)" }}>
                <img src={img.imageUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ padding: "8px 10px" }}>
                <div className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                  {img.visibility === "community" ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                </div>
                {img.tags.length > 0 && (
                  <div className="text-xs mt-1 truncate" style={{ color: "var(--labs-text)" }} title={img.tags.join(", ")}>
                    {img.tags.slice(0, 3).join(" · ")}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <ModalPortal open={!!detail} onClose={() => setDetail(null)} testId="modal-ai-image-detail">
        {detail && (
          <div
            className="rounded-xl p-4 max-w-xl w-full"
            style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ aspectRatio: "16/9", background: "var(--labs-surface)", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
              <img src={detail.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div className="text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>
              {new Date(detail.createdAt).toLocaleString()}
            </div>
            {detail.promptHint && (
              <div className="text-sm mb-2" style={{ color: "var(--labs-text)" }}>
                <span className="font-semibold">{t("labs.aiImages.promptHint")}:</span> {detail.promptHint}
              </div>
            )}
            <details className="mb-2">
              <summary className="text-xs cursor-pointer" style={{ color: "var(--labs-text-muted)" }}>{t("labs.aiImages.fullPrompt")}</summary>
              <p className="text-xs mt-1" style={{ color: "var(--labs-text)", whiteSpace: "pre-wrap" }}>{detail.prompt}</p>
            </details>
            {detail.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {detail.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-text)" }}>{tag}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end flex-wrap">
              <button
                className="labs-btn-ghost text-sm px-3 py-1.5"
                onClick={() => setDetail(null)}
                data-testid="button-ai-image-close"
              >
                {t("labs.aiImages.close")}
              </button>
              {detail.ownerId === pid && (
                <>
                  <button
                    className="labs-btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
                    onClick={() => handleToggleVisibility(detail)}
                    disabled={busyId === detail.id}
                    data-testid="button-ai-image-toggle-visibility"
                  >
                    {detail.visibility === "community" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {detail.visibility === "community" ? t("labs.aiImages.makePrivate") : t("labs.aiImages.shareCommunity")}
                  </button>
                  <button
                    className="labs-btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
                    style={{ color: "var(--labs-error, #ef4444)" }}
                    onClick={() => handleDelete(detail)}
                    disabled={busyId === detail.id}
                    data-testid="button-ai-image-delete"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t("labs.aiImages.delete")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return useMemo(() => debounced, [debounced]);
}
