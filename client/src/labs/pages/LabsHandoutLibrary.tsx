import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import {
  ChevronLeft, FileText, Image as ImageIcon, Library, Search, Trash2,
  Pencil, Save, X, ExternalLink, Download, Globe, Lock, Plus, Upload, Loader2, RefreshCw, Scissors,
} from "lucide-react";
import { getParticipantId, handoutLibraryApi } from "@/lib/api";
import { downloadFromEndpoint } from "@/lib/download";
import type { WhiskyHandoutLibraryEntry } from "@shared/schema";
import HandoutLibraryPdfSplitterDialog from "../components/HandoutLibraryPdfSplitterDialog";

interface EditState {
  id: string;
  whiskyName: string;
  distillery: string;
  whiskybaseId: string;
  title: string;
  author: string;
  description: string;
}

type TabKey = "mine" | "community";

interface UploadFormState {
  file: File | null;
  whiskyName: string;
  distillery: string;
  whiskybaseId: string;
  title: string;
  author: string;
  description: string;
  splitProgramme: boolean;
}

const emptyUploadForm: UploadFormState = {
  file: null,
  whiskyName: "",
  distillery: "",
  whiskybaseId: "",
  title: "",
  author: "",
  description: "",
  splitProgramme: false,
};

function fmtDate(d: Date | string | null | undefined, locale: string): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function HandoutSkeletonTile() {
  return (
    <div
      className="labs-card"
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}
      aria-hidden="true"
      data-testid="handout-library-skeleton-tile"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div className="labs-handout-skeleton-block" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="labs-handout-skeleton-block" style={{ height: 14, width: "70%" }} />
          <div className="labs-handout-skeleton-block" style={{ height: 10, width: "45%" }} />
        </div>
      </div>
      <div className="labs-handout-skeleton-block" style={{ height: 10, width: "85%" }} />
      <div className="labs-handout-skeleton-block" style={{ height: 10, width: "60%" }} />
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--labs-border)", paddingTop: 10 }}>
        <div className="labs-handout-skeleton-block" style={{ height: 22, width: 36 }} />
        <div className="labs-handout-skeleton-block" style={{ height: 22, width: 36 }} />
        <div className="labs-handout-skeleton-block" style={{ height: 22, width: 36 }} />
      </div>
    </div>
  );
}

interface HandoutTileProps {
  entry: WhiskyHandoutLibraryEntry;
  metaParts: string[];
  isPdf: boolean;
  isSelected: boolean;
  toggleSelected: (id: string) => void;
  onOpen: () => void;
  onDownload: () => void;
  onShareToggle: () => void;
  onReplace: () => void;
  onSplit: () => void;
  onEdit: () => void;
  onDelete: () => void;
  shareDisabled: boolean;
  replaceDisabled: boolean;
  replaceLoading: boolean;
  deleteDisabled: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function HandoutTile(props: HandoutTileProps) {
  const {
    entry, metaParts, isPdf, isSelected, toggleSelected,
    onOpen, onDownload, onShareToggle, onReplace, onSplit, onEdit, onDelete,
    shareDisabled, replaceDisabled, replaceLoading, deleteDisabled, t,
  } = props;
  return (
    <div
      className="labs-card"
      style={{
        border: isSelected ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 200,
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: isSelected ? "0 0 0 3px var(--labs-accent-muted)" : undefined,
      }}
      data-testid={`handout-library-row-${entry.id}`}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelected(entry.id)}
          style={{ flexShrink: 0, marginTop: 4 }}
          data-testid={`checkbox-handout-${entry.id}`}
        />
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: "var(--labs-accent-muted)",
            color: "var(--labs-accent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {isPdf ? <FileText style={{ width: 20, height: 20 }} /> : <ImageIcon style={{ width: 20, height: 20 }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3, wordBreak: "break-word" }}>
            {entry.title || entry.whiskyName}
          </div>
          {(entry.isProgramme || entry.isShared) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {entry.isProgramme && (
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                  data-testid={`badge-programme-${entry.id}`}
                  title={t("labs.handoutSplitter.programmeBadge")}
                >
                  <Library style={{ width: 10, height: 10 }} /> {t("labs.handoutSplitter.programmeBadge")}
                </span>
              )}
              {entry.isShared && (
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "var(--labs-success-muted)", color: "var(--labs-success)" }}
                  data-testid={`badge-shared-${entry.id}`}
                  title={t("labs.handoutLibrary.badgeSharedTitle")}
                >
                  <Globe style={{ width: 10, height: 10 }} /> {t("labs.handoutLibrary.badgeShared")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {entry.title && entry.whiskyName && entry.title !== entry.whiskyName && (
        <div style={{ fontSize: 12, color: "var(--labs-text)", fontWeight: 500 }}>{entry.whiskyName}</div>
      )}
      {metaParts.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.5 }}>{metaParts.join(" \u00b7 ")}</div>
      )}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, borderTop: "1px solid var(--labs-border)", paddingTop: 10 }}>
        <a
          href={entry.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="labs-btn-secondary text-xs"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
          data-testid={`button-handout-open-${entry.id}`}
          title={t("labs.handoutLibrary.actionOpen")}
          aria-label={t("labs.handoutLibrary.actionOpen")}
          onClick={onOpen}
        >
          <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
        <button
          type="button"
          className="labs-btn-secondary text-xs"
          onClick={onDownload}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
          data-testid={`button-handout-download-${entry.id}`}
          title={t("labs.handoutLibrary.actionDownload")}
          aria-label={t("labs.handoutLibrary.actionDownload")}
        >
          <Download style={{ width: 12, height: 12 }} />
        </button>
        <button
          type="button"
          className="labs-btn-secondary text-xs"
          onClick={onShareToggle}
          disabled={shareDisabled}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", color: entry.isShared ? "var(--labs-accent)" : undefined }}
          data-testid={`button-handout-share-${entry.id}`}
          title={entry.isShared ? t("labs.handoutLibrary.actionShareOff") : t("labs.handoutLibrary.actionShareOn")}
          aria-label={entry.isShared ? t("labs.handoutLibrary.actionShareOff") : t("labs.handoutLibrary.actionShareOn")}
        >
          {entry.isShared ? <Lock style={{ width: 12, height: 12 }} /> : <Globe style={{ width: 12, height: 12 }} />}
        </button>
        <button
          type="button"
          className="labs-btn-secondary text-xs"
          onClick={onReplace}
          disabled={replaceDisabled}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
          data-testid={`button-handout-replace-${entry.id}`}
          title={t("labs.handoutLibrary.actionReplace")}
          aria-label={t("labs.handoutLibrary.actionReplace")}
        >
          {replaceLoading
            ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
            : <RefreshCw style={{ width: 12, height: 12 }} />}
        </button>
        {isPdf && (
          <button
            type="button"
            className="labs-btn-secondary text-xs"
            onClick={onSplit}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
            data-testid={`button-handout-split-${entry.id}`}
            title={t("labs.handoutSplitter.title")}
            aria-label={t("labs.handoutSplitter.title")}
          >
            <Scissors style={{ width: 12, height: 12 }} />
          </button>
        )}
        <button
          type="button"
          className="labs-btn-secondary text-xs"
          onClick={onEdit}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
          data-testid={`button-handout-edit-${entry.id}`}
          title={t("labs.handoutLibrary.actionEdit")}
          aria-label={t("labs.handoutLibrary.actionEdit")}
        >
          <Pencil style={{ width: 12, height: 12 }} />
        </button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="labs-btn-secondary text-xs"
          onClick={onDelete}
          disabled={deleteDisabled}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", color: "var(--labs-danger)" }}
          data-testid={`button-handout-delete-${entry.id}`}
          title={t("labs.handoutLibrary.actionDelete")}
          aria-label={t("labs.handoutLibrary.actionDelete")}
        >
          <Trash2 style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  );
}

interface CommunityHandoutTileProps {
  entry: WhiskyHandoutLibraryEntry;
  metaParts: string[];
  isPdf: boolean;
  onAdopt: () => void;
  adoptDisabled: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function CommunityHandoutTile(props: CommunityHandoutTileProps) {
  const { entry, metaParts, isPdf, onAdopt, adoptDisabled, t } = props;
  return (
    <div
      className="labs-card"
      style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}
      data-testid={`handout-community-row-${entry.id}`}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: "var(--labs-accent-muted)",
            color: "var(--labs-accent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {isPdf ? <FileText style={{ width: 20, height: 20 }} /> : <ImageIcon style={{ width: 20, height: 20 }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3, wordBreak: "break-word" }}>
            {entry.title || entry.whiskyName}
          </div>
        </div>
      </div>
      {entry.title && entry.whiskyName && entry.title !== entry.whiskyName && (
        <div style={{ fontSize: 12, color: "var(--labs-text)", fontWeight: 500 }}>{entry.whiskyName}</div>
      )}
      {metaParts.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.5 }}>{metaParts.join(" \u00b7 ")}</div>
      )}
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--labs-border)", paddingTop: 10 }}>
        <a
          href={entry.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="labs-btn-secondary text-xs"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px" }}
          data-testid={`button-community-open-${entry.id}`}
          title={t("labs.handoutLibrary.communityPreview")}
          aria-label={t("labs.handoutLibrary.communityPreview")}
        >
          <ExternalLink style={{ width: 12, height: 12 }} />
        </a>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="labs-btn-primary text-xs"
          onClick={onAdopt}
          disabled={adoptDisabled}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px" }}
          data-testid={`button-community-clone-${entry.id}`}
          title={t("labs.handoutLibrary.communityAdoptTitle")}
        >
          <Plus style={{ width: 12, height: 12 }} /> {t("labs.handoutLibrary.communityAdopt")}
        </button>
      </div>
    </div>
  );
}

export default function LabsHandoutLibrary() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";
  const hostId = getParticipantId() || "";
  const qc = useQueryClient();
  const searchStr = useSearch();
  const initialTab: TabKey = useMemo(() => {
    try {
      const params = new URLSearchParams(searchStr);
      return params.get("tab") === "community" ? "community" : "mine";
    } catch {
      return "mine";
    }
    // Only the first render — subsequent tab changes are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(emptyUploadForm);
  const [distilleryFilter, setDistilleryFilter] = useState<string>("");
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [splitTarget, setSplitTarget] = useState<WhiskyHandoutLibraryEntry | null>(null);

  const listQuery = useQuery<WhiskyHandoutLibraryEntry[]>({
    queryKey: ["handout-library", hostId, search],
    queryFn: () => handoutLibraryApi.list(hostId, search.trim() || undefined),
    enabled: !!hostId,
  });

  const communityQuery = useQuery<WhiskyHandoutLibraryEntry[]>({
    queryKey: ["handout-library-community", hostId, communitySearch],
    queryFn: () => handoutLibraryApi.listCommunity(hostId, communitySearch.trim() || undefined),
    enabled: !!hostId && tab === "community",
  });

  const allEntries = useMemo(() => listQuery.data || [], [listQuery.data]);
  const distilleryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of allEntries) {
      const d = (e.distillery || "").trim();
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, locale));
  }, [allEntries]);
  const filtered = useMemo(() => {
    if (!distilleryFilter) return allEntries;
    const f = distilleryFilter.trim().toLowerCase();
    return allEntries.filter((e) => (e.distillery || "").trim().toLowerCase() === f);
  }, [allEntries, distilleryFilter]);
  const community = useMemo(() => communityQuery.data || [], [communityQuery.data]);

  const updateMut = useMutation({
    mutationFn: (e: EditState) => handoutLibraryApi.update(e.id, hostId, {
      whiskyName: e.whiskyName.trim() || undefined,
      distillery: e.distillery.trim() || null,
      whiskybaseId: e.whiskybaseId.trim() || null,
      title: e.title.trim() || null,
      author: e.author.trim() || null,
      description: e.description.trim() || null,
    }),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
    },
    onError: (e: any) => setError(e?.message || t("labs.handoutLibrary.errUpdate")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => handoutLibraryApi.delete(id, hostId),
    onSuccess: () => {
      setError(null);
      setInfo(t("labs.handoutLibrary.msgDeleted"));
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
    },
    onError: (e: any) => setError(e?.message || t("labs.handoutLibrary.errDelete")),
  });

  const shareMut = useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      handoutLibraryApi.setShared(id, hostId, isShared),
    onSuccess: (_d, vars) => {
      setError(null);
      setInfo(vars.isShared ? t("labs.handoutLibrary.msgSharedOn") : t("labs.handoutLibrary.msgSharedOff"));
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      qc.invalidateQueries({ queryKey: ["handout-library-community", hostId] });
    },
    onError: (e: any) => setError(e?.message || t("labs.handoutLibrary.errShare")),
  });

  const cloneMut = useMutation({
    mutationFn: (id: string) => handoutLibraryApi.cloneFromCommunity(id, hostId),
    onSuccess: () => {
      setError(null);
      setInfo(t("labs.handoutLibrary.msgAdopted"));
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
    },
    onError: (e: any) => setError(e?.message || t("labs.handoutLibrary.errAdopt")),
  });

  const uploadMut = useMutation<any, Error, void, { wantsSplit: boolean; isPdf: boolean }>({
    onMutate: () => ({
      wantsSplit: !!uploadForm.splitProgramme,
      isPdf:
        (uploadForm.file?.type || "").toLowerCase() === "application/pdf" ||
        (uploadForm.file?.name || "").toLowerCase().endsWith(".pdf"),
    }),
    mutationFn: async () => {
      if (!uploadForm.file) throw new Error(t("labs.handoutLibrary.errSelectFile"));
      if (!uploadForm.whiskyName.trim()) throw new Error(t("labs.handoutLibrary.errWhiskyNameRequired"));
      return handoutLibraryApi.upload(hostId, uploadForm.file, {
        whiskyName: uploadForm.whiskyName.trim(),
        distillery: uploadForm.distillery.trim(),
        whiskybaseId: uploadForm.whiskybaseId.trim(),
        title: uploadForm.title.trim(),
        author: uploadForm.author.trim(),
        description: uploadForm.description.trim(),
      });
    },
    onSuccess: (created: WhiskyHandoutLibraryEntry, _vars, ctx) => {
      setError(null);
      setInfo(t("labs.handoutLibrary.msgUploaded"));
      setUploadForm(emptyUploadForm);
      setUploadOpen(false);
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      if (ctx?.wantsSplit && ctx.isPdf && created?.id) {
        setSplitTarget(created);
      }
    },
    onError: (e: any) => setError(e?.message || t("labs.handoutLibrary.errUpload")),
  });

  const replaceFileMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => handoutLibraryApi.replaceFile(id, hostId, file),
    onSuccess: () => {
      setError(null);
      setInfo(t("labs.handoutLibrary.msgFileReplaced"));
      setReplaceTargetId(null);
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
    },
    onError: (e: any) => {
      setReplaceTargetId(null);
      setError(e?.message || t("labs.handoutLibrary.errReplace"));
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => handoutLibraryApi.bulkDelete(ids, hostId),
    onSuccess: () => {
      setError(null);
      setInfo(t("labs.handoutLibrary.msgDeleted"));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      qc.invalidateQueries({ queryKey: ["handout-library-community", hostId] });
    },
    onError: (e: any) => setError(e?.message || t("labs.handoutLibrary.errDelete")),
  });

  const bulkShareMut = useMutation({
    mutationFn: ({ ids, isShared }: { ids: string[]; isShared: boolean }) =>
      handoutLibraryApi.bulkShare(ids, hostId, isShared),
    onSuccess: (_data, vars) => {
      setError(null);
      setInfo(vars.isShared
        ? t("labs.handoutLibrary.msgBulkSharedOn")
        : t("labs.handoutLibrary.msgBulkSharedOff"));
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["handout-library", hostId] });
      qc.invalidateQueries({ queryKey: ["handout-library-community", hostId] });
    },
    onError: (e: any) => setError(e?.message || t("labs.handoutLibrary.errShare")),
  });

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((e) => e.id)));
  };

  if (!hostId) {
    return (
      <div style={{ padding: 24, color: "var(--labs-text)" }}>
        <p>{t("labs.handoutLibrary.loginRequired")}</p>
        <Link href="/labs/host" data-testid="link-back-host">{t("labs.handoutLibrary.back")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 16px 64px", maxWidth: 1100, margin: "0 auto", color: "var(--labs-text)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link
          href="/labs/host"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--labs-text-muted)", textDecoration: "none", fontSize: 13 }}
          data-testid="link-back-host"
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          {t("labs.handoutLibrary.back")}
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Library style={{ width: 20, height: 20, color: "var(--labs-accent, var(--labs-text))" }} />
        <h1 style={{ fontSize: 22, margin: 0, fontWeight: 600, color: "var(--labs-text)" }} data-testid="text-handout-library-title">
          {t("labs.handoutLibrary.title")}
        </h1>
      </div>
      <p style={{ color: "var(--labs-text-muted)", fontSize: 13, margin: "0 0 16px" }}>
        {t("labs.handoutLibrary.subtitle")}
      </p>

      <div role="tablist" style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--labs-border)" }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mine"}
          onClick={() => { setTab("mine"); setError(null); setInfo(null); }}
          className="labs-btn-ghost text-xs"
          style={{
            padding: "8px 12px",
            borderRadius: 0,
            borderBottom: tab === "mine" ? "2px solid var(--labs-accent)" : "2px solid transparent",
            color: tab === "mine" ? "var(--labs-text)" : "var(--labs-text-muted)",
            fontWeight: tab === "mine" ? 600 : 400,
          }}
          data-testid="tab-handout-library-mine"
        >
          {t("labs.handoutLibrary.tabMine")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "community"}
          onClick={() => { setTab("community"); setError(null); setInfo(null); }}
          className="labs-btn-ghost text-xs"
          style={{
            padding: "8px 12px",
            borderRadius: 0,
            borderBottom: tab === "community" ? "2px solid var(--labs-accent)" : "2px solid transparent",
            color: tab === "community" ? "var(--labs-text)" : "var(--labs-text-muted)",
            fontWeight: tab === "community" ? 600 : 400,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          data-testid="tab-handout-library-community"
        >
          <Globe style={{ width: 13, height: 13 }} />
          {t("labs.handoutLibrary.tabCommunity")}
        </button>
      </div>

      {error && (
        <div
          style={{ background: "var(--labs-danger-muted)", color: "var(--labs-danger)", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13, border: "1px solid var(--labs-border)" }}
          data-testid="text-handout-library-error"
        >
          {error}
        </div>
      )}
      {info && (
        <div
          style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)", padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13, border: "1px solid var(--labs-border)" }}
          data-testid="text-handout-library-info"
        >
          {info}
        </div>
      )}

      {tab === "mine" && (
        <>
          <div
            className="labs-card"
            style={{ padding: 12, marginBottom: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}
            data-testid="handout-library-toolbar"
          >
            <div style={{ flex: "1 1 220px", position: "relative", minWidth: 200 }}>
              <Search style={{ width: 14, height: 14, color: "var(--labs-text-muted)", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("labs.handoutLibrary.searchPlaceholder")}
                className="labs-input"
                style={{ width: "100%", paddingLeft: 32 }}
                data-testid="input-handout-library-search"
              />
            </div>
            <select
              className="labs-input"
              value={distilleryFilter}
              onChange={(e) => setDistilleryFilter(e.target.value)}
              style={{ flex: "0 1 220px", minWidth: 160, fontSize: 12 }}
              data-testid="select-handout-library-distillery"
              aria-label={t("labs.handoutLibrary.filterDistilleryLabel")}
            >
              <option value="">{t("labs.handoutLibrary.filterDistilleryAll")}</option>
              {distilleryOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button
              type="button"
              className="labs-btn-primary text-xs"
              onClick={() => { setUploadOpen(true); setError(null); setInfo(null); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", whiteSpace: "nowrap" }}
              data-testid="button-handout-library-upload"
            >
              <Upload style={{ width: 13, height: 13 }} /> {t("labs.handoutLibrary.uploadButton")}
            </button>
          </div>

          <input
            ref={replaceFileInputRef}
            type="file"
            accept="application/pdf,image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              const target = replaceTargetId;
              if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
              if (file && target) replaceFileMut.mutate({ id: target, file });
            }}
            data-testid="input-handout-library-replace-file"
          />

          {uploadOpen && (
            <div
              style={{ border: "1px solid var(--labs-accent, var(--labs-border))", borderRadius: 12, padding: 14, background: "var(--labs-surface)", display: "grid", gap: 10, marginBottom: 14 }}
              data-testid="handout-library-upload-form"
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 13, color: "var(--labs-text)" }}>{t("labs.handoutLibrary.uploadFormTitle")}</strong>
                <button
                  type="button"
                  className="labs-btn-ghost text-xs"
                  onClick={() => { setUploadOpen(false); setUploadForm(emptyUploadForm); }}
                  data-testid="button-upload-form-close"
                  style={{ padding: 4 }}
                  aria-label={t("labs.handoutLibrary.cancel")}
                  title={t("labs.handoutLibrary.cancel")}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                data-testid="input-upload-file"
                style={{ fontSize: 12 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                  {t("labs.handoutLibrary.fieldWhiskyName")} *
                  <input
                    className="labs-input"
                    value={uploadForm.whiskyName}
                    onChange={(e) => setUploadForm({ ...uploadForm, whiskyName: e.target.value })}
                    data-testid="input-upload-whiskyname"
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                  {t("labs.handoutLibrary.fieldDistillery")}
                  <input
                    className="labs-input"
                    value={uploadForm.distillery}
                    onChange={(e) => setUploadForm({ ...uploadForm, distillery: e.target.value })}
                    data-testid="input-upload-distillery"
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                  {t("labs.handoutLibrary.fieldWhiskybaseId")}
                  <input
                    className="labs-input"
                    value={uploadForm.whiskybaseId}
                    onChange={(e) => setUploadForm({ ...uploadForm, whiskybaseId: e.target.value })}
                    data-testid="input-upload-wbid"
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                  {t("labs.handoutLibrary.fieldTitle")}
                  <input
                    className="labs-input"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    data-testid="input-upload-title"
                  />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                  {t("labs.handoutLibrary.fieldAuthor")}
                  <input
                    className="labs-input"
                    value={uploadForm.author}
                    onChange={(e) => setUploadForm({ ...uploadForm, author: e.target.value })}
                    data-testid="input-upload-author"
                  />
                </label>
              </div>
              <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                {t("labs.handoutLibrary.fieldDescription")}
                <textarea
                  className="labs-input"
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  data-testid="input-upload-description"
                />
              </label>
              {(() => {
                const f = uploadForm.file;
                if (!f) return false;
                const mime = (f.type || "").toLowerCase();
                const name = (f.name || "").toLowerCase();
                return mime === "application/pdf" || name.endsWith(".pdf");
              })() && (
                <label
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: 10, borderRadius: 8,
                    border: "1px solid var(--labs-border)",
                    background: "var(--labs-surface)",
                    fontSize: 12, color: "var(--labs-text)",
                  }}
                  data-testid="label-upload-split-programme"
                >
                  <input
                    type="checkbox"
                    checked={uploadForm.splitProgramme}
                    onChange={(e) => setUploadForm({ ...uploadForm, splitProgramme: e.target.checked })}
                    data-testid="checkbox-upload-split-programme"
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ display: "grid", gap: 2 }}>
                    <span>{t("labs.handoutSplitter.uploadOption")}</span>
                    <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                      {t("labs.handoutSplitter.uploadOptionHint")}
                    </span>
                  </span>
                </label>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="labs-btn-secondary text-xs"
                  onClick={() => { setUploadOpen(false); setUploadForm(emptyUploadForm); }}
                  data-testid="button-upload-cancel"
                >
                  {t("labs.handoutLibrary.cancel")}
                </button>
                <button
                  type="button"
                  className="labs-btn-primary text-xs"
                  onClick={() => uploadMut.mutate()}
                  disabled={uploadMut.isPending || !uploadForm.file || !uploadForm.whiskyName.trim()}
                  data-testid="button-upload-submit"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {uploadMut.isPending ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <Upload style={{ width: 12, height: 12 }} />}
                  {uploadMut.isPending ? t("labs.handoutLibrary.uploading") : t("labs.handoutLibrary.uploadButton")}
                </button>
              </div>
            </div>
          )}

          {selected.size > 0 && (
            <div
              style={{ position: "sticky", top: 8, zIndex: 5, border: "1px solid var(--labs-accent, var(--labs-border))", borderRadius: 10, padding: "8px 12px", background: "var(--labs-surface)", display: "flex", alignItems: "center", gap: 10, marginBottom: 10, boxShadow: "0 4px 12px var(--labs-accent-glow)" }}
              data-testid="handout-library-bulk-bar"
            >
              <span style={{ fontSize: 12, color: "var(--labs-text)" }} data-testid="text-bulk-selected-count">
                {t("labs.handoutLibrary.selectedCount", { count: selected.size })}
              </span>
              <button
                type="button"
                className="labs-btn-secondary text-xs"
                onClick={() => bulkShareMut.mutate({ ids: Array.from(selected), isShared: true })}
                disabled={bulkShareMut.isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px" }}
                data-testid="button-bulk-share"
              >
                <Globe style={{ width: 12, height: 12 }} /> {t("labs.handoutLibrary.bulkShare")}
              </button>
              <button
                type="button"
                className="labs-btn-secondary text-xs"
                onClick={() => bulkShareMut.mutate({ ids: Array.from(selected), isShared: false })}
                disabled={bulkShareMut.isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px" }}
                data-testid="button-bulk-unshare"
              >
                <Lock style={{ width: 12, height: 12 }} /> {t("labs.handoutLibrary.bulkUnshare")}
              </button>
              <button
                type="button"
                className="labs-btn-secondary text-xs"
                onClick={() => {
                  if (window.confirm(t("labs.handoutLibrary.confirmBulkDelete", { count: selected.size }))) {
                    bulkDeleteMut.mutate(Array.from(selected));
                  }
                }}
                disabled={bulkDeleteMut.isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", color: "var(--labs-danger)" }}
                data-testid="button-bulk-delete"
              >
                <Trash2 style={{ width: 12, height: 12 }} /> {t("labs.handoutLibrary.bulkDelete")}
              </button>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                className="labs-btn-ghost text-xs"
                onClick={() => setSelected(new Set())}
                style={{ padding: "4px 8px" }}
                data-testid="button-bulk-clear"
                aria-label={t("labs.handoutLibrary.bulkClear")}
                title={t("labs.handoutLibrary.bulkClear")}
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                data-testid="checkbox-handout-select-all"
              />
              {t("labs.handoutLibrary.selectAll")}
            </label>
          )}

          {listQuery.isLoading && (
            <div
              className="labs-handout-grid"
              role="status"
              aria-live="polite"
              aria-label={t("labs.handoutLibrary.loading")}
              data-testid="text-handout-library-loading"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <HandoutSkeletonTile key={i} />
              ))}
            </div>
          )}

          {!listQuery.isLoading && filtered.length === 0 && (
            <div
              className="labs-card"
              style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
              data-testid="text-handout-library-empty"
            >
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--labs-accent-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
                <Library style={{ width: 26, height: 26, color: "var(--labs-accent)" }} strokeWidth={1.6} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)" }}>
                {search ? t("labs.handoutLibrary.emptyNoMatch") : t("labs.handoutLibrary.emptyTitle")}
              </div>
              {!search && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--labs-text-muted)", maxWidth: 360, lineHeight: 1.5 }}>
                  {t("labs.handoutLibrary.emptyNoEntries")}
                </p>
              )}
              {!search && (
                <button
                  type="button"
                  className="labs-btn-primary text-xs"
                  onClick={() => { setUploadOpen(true); setError(null); setInfo(null); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", marginTop: 4 }}
                  data-testid="button-handout-library-empty-upload"
                >
                  <Upload style={{ width: 13, height: 13 }} /> {t("labs.handoutLibrary.emptyCta")}
                </button>
              )}
            </div>
          )}

          <div className="labs-handout-grid">
            {filtered.map((entry) => {
              const isEditing = editing?.id === entry.id;
              const isPdf = entry.contentType === "application/pdf";
              if (isEditing) {
                return (
                  <div
                    key={entry.id}
                    className="labs-card"
                    style={{ gridColumn: "1 / -1", padding: 14, display: "grid", gap: 8 }}
                    data-testid={`handout-library-edit-${entry.id}`}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                        {t("labs.handoutLibrary.fieldWhiskyName")}
                        <input className="labs-input" value={editing!.whiskyName} onChange={(e) => setEditing({ ...editing!, whiskyName: e.target.value })} data-testid={`input-edit-name-${entry.id}`} />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                        {t("labs.handoutLibrary.fieldDistillery")}
                        <input className="labs-input" value={editing!.distillery} onChange={(e) => setEditing({ ...editing!, distillery: e.target.value })} data-testid={`input-edit-distillery-${entry.id}`} />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                        {t("labs.handoutLibrary.fieldWhiskybaseId")}
                        <input className="labs-input" value={editing!.whiskybaseId} onChange={(e) => setEditing({ ...editing!, whiskybaseId: e.target.value })} data-testid={`input-edit-wbid-${entry.id}`} />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                        {t("labs.handoutLibrary.fieldTitle")}
                        <input className="labs-input" value={editing!.title} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} data-testid={`input-edit-title-${entry.id}`} />
                      </label>
                      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                        {t("labs.handoutLibrary.fieldAuthor")}
                        <input className="labs-input" value={editing!.author} onChange={(e) => setEditing({ ...editing!, author: e.target.value })} data-testid={`input-edit-author-${entry.id}`} />
                      </label>
                    </div>
                    <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--labs-text)" }}>
                      {t("labs.handoutLibrary.fieldDescription")}
                      <textarea className="labs-input" rows={2} value={editing!.description} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} data-testid={`input-edit-desc-${entry.id}`} />
                    </label>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" className="labs-btn-secondary text-xs" onClick={() => setEditing(null)} data-testid={`button-edit-cancel-${entry.id}`}>
                        <X style={{ width: 12, height: 12, marginRight: 4 }} /> {t("labs.handoutLibrary.cancel")}
                      </button>
                      <button type="button" className="labs-btn-primary text-xs" onClick={() => updateMut.mutate(editing!)} disabled={updateMut.isPending} data-testid={`button-edit-save-${entry.id}`}>
                        <Save style={{ width: 12, height: 12, marginRight: 4 }} /> {t("labs.handoutLibrary.save")}
                      </button>
                    </div>
                  </div>
                );
              }
              const metaParts = [
                entry.distillery,
                entry.whiskybaseId && `WB ${entry.whiskybaseId}`,
                entry.author && t("labs.handoutLibrary.metaBy", { author: entry.author }),
                fmtDate(entry.createdAt, locale),
              ].filter(Boolean) as string[];
              return (
                <HandoutTile
                  key={entry.id}
                  entry={entry}
                  metaParts={metaParts}
                  isPdf={isPdf}
                  isSelected={selected.has(entry.id)}
                  toggleSelected={toggleSelected}
                  onOpen={() => { /* anchor handles navigation */ }}
                  onDownload={() => downloadFromEndpoint(entry.fileUrl, entry.title || entry.whiskyName)}
                  onShareToggle={() => shareMut.mutate({ id: entry.id, isShared: !entry.isShared })}
                  onReplace={() => { setReplaceTargetId(entry.id); replaceFileInputRef.current?.click(); }}
                  onSplit={() => { setSplitTarget(entry); setError(null); setInfo(null); }}
                  onEdit={() => setEditing({
                    id: entry.id,
                    whiskyName: entry.whiskyName || "",
                    distillery: entry.distillery || "",
                    whiskybaseId: entry.whiskybaseId || "",
                    title: entry.title || "",
                    author: entry.author || "",
                    description: entry.description || "",
                  })}
                  onDelete={() => {
                    if (window.confirm(t("labs.handoutLibrary.confirmDelete"))) {
                      deleteMut.mutate(entry.id);
                    }
                  }}
                  shareDisabled={shareMut.isPending}
                  replaceDisabled={replaceFileMut.isPending}
                  replaceLoading={replaceFileMut.isPending && replaceTargetId === entry.id}
                  deleteDisabled={deleteMut.isPending}
                  t={t}
                />
              );
            })}
          </div>
        </>
      )}

      <HandoutLibraryPdfSplitterDialog
        open={!!splitTarget}
        onClose={() => setSplitTarget(null)}
        entry={splitTarget}
        hostId={hostId}
      />

      {tab === "community" && (
        <>
          <p style={{ color: "var(--labs-text-muted)", fontSize: 12, margin: "0 0 12px" }}>
            {t("labs.handoutCommunity.intro")}
            {" "}
            <Link
              href="/impressum"
              style={{ color: "var(--labs-accent)", textDecoration: "underline" }}
              data-testid="link-handout-community-takedown"
            >
              {t("labs.handoutCommunity.takedownLink")}
            </Link>
            .
          </p>

          <div
            className="labs-card"
            style={{ padding: 12, marginBottom: 12, position: "relative" }}
            data-testid="handout-community-toolbar"
          >
            <Search style={{ width: 14, height: 14, color: "var(--labs-text-muted)", position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              value={communitySearch}
              onChange={(e) => setCommunitySearch(e.target.value)}
              placeholder={t("labs.handoutLibrary.communitySearchPlaceholder")}
              className="labs-input"
              style={{ width: "100%", paddingLeft: 32 }}
              data-testid="input-handout-community-search"
            />
          </div>

          {communityQuery.isLoading && (
            <div
              className="labs-handout-grid"
              role="status"
              aria-live="polite"
              aria-label={t("labs.handoutLibrary.loading")}
              data-testid="text-handout-community-loading"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <HandoutSkeletonTile key={i} />
              ))}
            </div>
          )}

          {!communityQuery.isLoading && community.length === 0 && (
            <div
              className="labs-card"
              style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
              data-testid="text-handout-community-empty"
            >
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--labs-accent-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
                <Globe style={{ width: 26, height: 26, color: "var(--labs-accent)" }} strokeWidth={1.6} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)" }}>
                {communitySearch ? t("labs.handoutLibrary.emptyNoMatch") : t("labs.handoutLibrary.communityEmptyTitle")}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--labs-text-muted)", maxWidth: 360, lineHeight: 1.5 }}>
                {communitySearch ? t("labs.handoutLibrary.communityEmptySearch") : t("labs.handoutLibrary.communityEmpty")}
              </p>
            </div>
          )}

          <div className="labs-handout-grid">
            {community.map((entry) => {
              const isPdf = entry.contentType === "application/pdf";
              const metaParts = [
                entry.distillery,
                entry.whiskybaseId && `WB ${entry.whiskybaseId}`,
                entry.sharedByName ? t("labs.handoutLibrary.metaShared", { name: entry.sharedByName }) : null,
                fmtDate(entry.sharedAt ?? entry.createdAt, locale),
              ].filter(Boolean) as string[];
              return (
                <CommunityHandoutTile
                  key={entry.id}
                  entry={entry}
                  metaParts={metaParts}
                  isPdf={isPdf}
                  onAdopt={() => cloneMut.mutate(entry.id)}
                  adoptDisabled={cloneMut.isPending}
                  t={t}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
