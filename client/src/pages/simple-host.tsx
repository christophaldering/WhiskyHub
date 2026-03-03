import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Calendar, Users, FileText, Settings, ChevronRight } from "lucide-react";
import SimpleShell from "@/components/simple/simple-shell";
import { getSession } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";

const colors = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "20px",
};

interface Tasting {
  id: number;
  title: string;
  status: string;
  code: string;
  date: string | null;
  location: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const badgeColors: Record<string, string> = {
    draft: "#888",
    open: "#6ec177",
    closed: "#d4a256",
    reveal: "#c084fc",
    archived: "#666",
  };

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: badgeColors[status] || colors.muted,
        background: `${badgeColors[status] || colors.muted}20`,
        padding: "2px 8px",
        borderRadius: 6,
      }}
      data-testid={`badge-status-${status}`}
    >
      {status}
    </span>
  );
}

export default function SimpleHostPage() {
  const [, navigate] = useLocation();
  const session = getSession();
  const pid = session.pid || localStorage.getItem("casksense_participant_id");

  const { data: tastings = [], isLoading } = useQuery<Tasting[]>({
    queryKey: ["/api/tastings", pid],
    queryFn: async () => {
      if (!pid) return [];
      const res = await fetch(`/api/tastings?hostId=${pid}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!pid,
  });

  const activeTastings = tastings.filter((t) => t.status === "open" || t.status === "reveal");
  const draftTastings = tastings.filter((t) => t.status === "draft");
  const pastTastings = tastings.filter((t) => t.status === "closed" || t.status === "archived");

  const handleCreateTasting = () => {
    navigate("/legacy/tasting/host");
  };

  if (!pid) {
    return (
      <SimpleShell showBack={false}>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }} data-testid="text-host-title">
            Host a Tasting
          </h2>
          <p style={{ color: colors.muted, fontSize: 14, marginBottom: 24 }} data-testid="text-sign-in-prompt">
            Sign in to create and manage your tastings.
          </p>
          <p style={{ color: colors.muted, fontSize: 13 }}>
            Use the key icon above to sign in first.
          </p>
        </div>
      </SimpleShell>
    );
  }

  return (
    <SimpleShell showBack={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }} data-testid="text-host-title">
              Host
            </h2>
            <p style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
              Create & manage your tastings
            </p>
          </div>
          <button
            onClick={handleCreateTasting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: colors.accent,
              color: colors.bg,
              border: "none",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
            data-testid="button-create-tasting"
          >
            <Plus style={{ width: 16, height: 16 }} />
            New Tasting
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", color: colors.muted, padding: "32px 0" }}>
            Loading...
          </div>
        ) : tastings.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <p style={{ color: colors.muted, fontSize: 14, margin: "8px 0" }} data-testid="text-no-tastings">
              No tastings yet. Create your first one!
            </p>
          </div>
        ) : (
          <>
            {activeTastings.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.accent, marginBottom: 10 }}>
                  Live
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeTastings.map((t) => (
                    <Link key={t.id} href={`/legacy/tasting/${t.id}`}>
                      <div style={{ ...cardStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`card-tasting-${t.id}`}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                          <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                            Code: {t.code}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={t.status} />
                          <ChevronRight style={{ width: 16, height: 16, color: colors.muted }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {draftTastings.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.muted, marginBottom: 10 }}>
                  Drafts
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {draftTastings.map((t) => (
                    <Link key={t.id} href={`/legacy/tasting/${t.id}`}>
                      <div style={{ ...cardStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`card-tasting-${t.id}`}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                          {t.date && <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{t.date}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={t.status} />
                          <ChevronRight style={{ width: 16, height: 16, color: colors.muted }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {pastTastings.length > 0 && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.muted, marginBottom: 10 }}>
                  History
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pastTastings.slice(0, 5).map((t) => (
                    <Link key={t.id} href={`/legacy/tasting/${t.id}`}>
                      <div style={{ ...cardStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`card-tasting-${t.id}`}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</div>
                          {t.date && <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{t.date}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StatusBadge status={t.status} />
                          <ChevronRight style={{ width: 16, height: 16, color: colors.muted }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                  {pastTastings.length > 5 && (
                    <Link href="/legacy/tasting/sessions">
                      <div style={{ textAlign: "center", color: colors.accent, fontSize: 13, padding: 8, cursor: "pointer" }} data-testid="link-all-sessions">
                        Show all {pastTastings.length} tastings →
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: colors.muted, marginBottom: 2 }}>
            Tools
          </h3>
          <Link href="/legacy/tasting?tab=templates">
            <div style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} data-testid="link-templates">
              <FileText style={{ width: 18, height: 18, color: colors.accent }} />
              <span style={{ fontSize: 14 }}>Tasting Templates</span>
              <ChevronRight style={{ width: 14, height: 14, color: colors.muted, marginLeft: "auto" }} />
            </div>
          </Link>
          <Link href="/legacy/tasting/calendar">
            <div style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} data-testid="link-calendar">
              <Calendar style={{ width: 18, height: 18, color: colors.accent }} />
              <span style={{ fontSize: 14 }}>Calendar</span>
              <ChevronRight style={{ width: 14, height: 14, color: colors.muted, marginLeft: "auto" }} />
            </div>
          </Link>
          <Link href="/legacy/tasting/host">
            <div style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }} data-testid="link-host-dashboard">
              <Settings style={{ width: 18, height: 18, color: colors.accent }} />
              <span style={{ fontSize: 14 }}>Full Host Dashboard</span>
              <ChevronRight style={{ width: 14, height: 14, color: colors.muted, marginLeft: "auto" }} />
            </div>
          </Link>
        </div>
      </div>
    </SimpleShell>
  );
}
