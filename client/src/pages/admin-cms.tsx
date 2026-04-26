import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import {
  listCmsPages,
  createCmsPage,
  duplicateCmsPage,
  deleteCmsPage,
  seedCmsHome,
  publishCmsPage,
  type CmsPageListItem,
  type CmsPageStatus,
} from "@/lib/cms-api";
import { ShieldAlert } from "lucide-react";

const ACCENT = "#C9A961";
const ACCENT_DIM = "rgba(201,169,97,0.25)";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: CmsPageStatus }) {
  const styles: Record<CmsPageStatus, { bg: string; color: string; label: string }> = {
    draft: { bg: "rgba(168,154,133,0.15)", color: "#A89A85", label: "Entwurf" },
    live: { bg: "rgba(123,176,119,0.15)", color: "#7BB077", label: "Live" },
    "live-changes": { bg: "rgba(217,167,87,0.15)", color: "#D9A757", label: "Live · Änderungen" },
  };
  const s = styles[status];
  return (
    <span
      data-testid={`status-${status}`}
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 11,
        letterSpacing: ".15em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {s.label}
    </span>
  );
}

export default function AdminCmsPage() {
  const { currentParticipant } = useAppStore();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentParticipant?.role === "admin";

  const { data: pages, isLoading } = useQuery<CmsPageListItem[]>({
    queryKey: ["/api/admin/cms/pages"],
    queryFn: listCmsPages,
    enabled: isAdmin,
  });

  const createMut = useMutation({
    mutationFn: () => createCmsPage({ slug: newSlug.trim(), title: newTitle.trim() }),
    onSuccess: (page) => {
      setShowCreate(false);
      setNewSlug("");
      setNewTitle("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      navigate(`/admin/cms/${page.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const duplicateMut = useMutation({
    mutationFn: ({ id, slug, title }: { id: string; slug: string; title: string }) => duplicateCmsPage(id, slug, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] }),
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCmsPage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] }),
    onError: (e: Error) => setError(e.message),
  });

  const publishMut = useMutation({
    mutationFn: (id: string) => publishCmsPage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] }),
    onError: (e: Error) => setError(e.message),
  });

  const seedMut = useMutation({
    mutationFn: () => seedCmsHome(),
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      navigate(`/admin/cms/${page.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, color: "#A89A85", fontFamily: "'Inter', sans-serif" }} data-testid="cms-no-access">
        <ShieldAlert style={{ width: 24, height: 24, color: ACCENT, marginBottom: 8 }} />
        <h1 style={{ fontFamily: "'EB Garamond', serif", color: "#F5EDE0", fontSize: 24 }}>Zugang verweigert</h1>
        <p>Diese Seite ist Administrator:innen vorbehalten.</p>
      </div>
    );
  }

  const homeExists = (pages ?? []).some((p) => p.slug === "home");

  return (
    <div data-testid="page-admin-cms" style={{ padding: 32, fontFamily: "'Inter', system-ui, sans-serif", color: "#F5EDE0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: ".4em", textTransform: "uppercase", color: ACCENT, marginBottom: 8 }}>Phase 5</div>
          <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: 32, fontWeight: 400, margin: 0, color: "#F5EDE0" }}>Landing-CMS</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!homeExists ? (
            <button
              type="button"
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}
              style={secondaryButton}
              data-testid="button-seed-home"
            >
              {seedMut.isPending ? "Lege an…" : "Startseite anlegen"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            style={primaryButton}
            data-testid="button-show-create"
          >
            + Neue Seite
          </button>
        </div>
      </div>

      {error ? (
        <div
          data-testid="cms-error"
          style={{
            background: "rgba(217,119,87,0.1)",
            border: "1px solid rgba(217,119,87,0.4)",
            padding: 12,
            borderRadius: 4,
            color: "#d97757",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {showCreate ? (
        <div
          data-testid="cms-create-form"
          style={{
            border: `1px solid ${ACCENT_DIM}`,
            borderRadius: 4,
            padding: 16,
            marginBottom: 24,
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr 1fr auto auto",
            alignItems: "end",
          }}
        >
          <label style={labelStyle}>
            <span>Slug</span>
            <input
              type="text"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="z.B. about"
              style={inputStyle}
              data-testid="input-new-slug"
            />
          </label>
          <label style={labelStyle}>
            <span>Titel</span>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Über uns"
              style={inputStyle}
              data-testid="input-new-title"
            />
          </label>
          <button
            type="button"
            disabled={!newSlug.trim() || !newTitle.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
            style={primaryButton}
            data-testid="button-create-page"
          >
            {createMut.isPending ? "…" : "Anlegen"}
          </button>
          <button type="button" onClick={() => setShowCreate(false)} style={secondaryButton} data-testid="button-cancel-create">
            Abbrechen
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div style={{ padding: 32, color: "#A89A85", fontFamily: "'EB Garamond', serif" }}>Lade Seiten…</div>
      ) : !pages || pages.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            border: `1px dashed ${ACCENT_DIM}`,
            borderRadius: 4,
            color: "#A89A85",
            fontFamily: "'EB Garamond', serif",
            fontStyle: "italic",
          }}
          data-testid="cms-empty-state"
        >
          Noch keine CMS-Seiten. Lege die Startseite an oder erstelle eine neue.
        </div>
      ) : (
        <table style={tableStyle} data-testid="cms-pages-table">
          <thead>
            <tr>
              <th style={thStyle}>Titel</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Blöcke</th>
              <th style={thStyle}>Aktualisiert</th>
              <th style={thStyle}>Veröffentlicht</th>
              <th style={thStyle}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} style={trStyle} data-testid={`cms-row-${p.slug}`}>
                <td style={tdStyle}>
                  <Link href={`/admin/cms/${p.id}`} data-testid={`link-cms-edit-${p.slug}`} style={{ color: "#F5EDE0", textDecoration: "none", fontFamily: "'EB Garamond', serif", fontSize: 16 }}>
                    {p.title}
                  </Link>
                </td>
                <td style={{ ...tdStyle, color: "#A89A85", fontFamily: "monospace", fontSize: 12 }}>/{p.slug}</td>
                <td style={tdStyle}><StatusBadge status={p.status} /></td>
                <td style={{ ...tdStyle, color: "#A89A85", fontSize: 12 }}>{p.blockCount}</td>
                <td style={{ ...tdStyle, color: "#A89A85", fontSize: 12 }}>{formatDate(p.updatedAt)}</td>
                <td style={{ ...tdStyle, color: "#A89A85", fontSize: 12 }}>{formatDate(p.publishedAt)}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {p.status !== "live" ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Seite „${p.title}" jetzt veröffentlichen?`)) publishMut.mutate(p.id);
                        }}
                        style={smallButton}
                        data-testid={`button-publish-${p.slug}`}
                      >
                        Veröffentlichen
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        const slug = prompt("Neuer Slug für die Kopie:", `${p.slug}-copy`)?.trim();
                        if (!slug) return;
                        const title = prompt("Neuer Titel:", `${p.title} (Kopie)`)?.trim();
                        if (!title) return;
                        duplicateMut.mutate({ id: p.id, slug, title });
                      }}
                      style={smallButton}
                      data-testid={`button-duplicate-${p.slug}`}
                    >
                      Duplizieren
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Seite „${p.title}" wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) {
                          deleteMut.mutate(p.id);
                        }
                      }}
                      style={{ ...smallButton, color: "#d97757", borderColor: "rgba(217,119,87,0.3)" }}
                      data-testid={`button-delete-${p.slug}`}
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 11,
  letterSpacing: ".15em",
  textTransform: "uppercase",
  color: "#A89A85",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(201,169,97,0.06)",
  border: `1px solid ${ACCENT_DIM}`,
  borderRadius: 4,
  padding: "10px 12px",
  color: "#F5EDE0",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  outline: "none",
};

const primaryButton: React.CSSProperties = {
  background: ACCENT,
  color: "#0B0906",
  border: "none",
  padding: "10px 18px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  borderRadius: 3,
};

const secondaryButton: React.CSSProperties = {
  background: "transparent",
  color: "#F5EDE0",
  border: `1px solid ${ACCENT_DIM}`,
  padding: "10px 18px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 12,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: 3,
};

const smallButton: React.CSSProperties = {
  background: "transparent",
  color: "#A89A85",
  border: `1px solid ${ACCENT_DIM}`,
  padding: "4px 10px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  letterSpacing: ".1em",
  cursor: "pointer",
  borderRadius: 3,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: `1px solid ${ACCENT_DIM}`,
  fontSize: 10,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  color: ACCENT,
  fontWeight: 500,
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid rgba(201,169,97,0.08)",
  verticalAlign: "middle",
};

const trStyle: React.CSSProperties = {};
