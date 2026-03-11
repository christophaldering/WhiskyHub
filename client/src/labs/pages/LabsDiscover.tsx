import { Link } from "wouter";
import {
  Compass, BookOpen, Building2, Package, FileText, Map,
  FlaskConical, BookMarked, MessageSquare, ChevronRight, ChevronLeft,
} from "lucide-react";
import type { ElementType } from "react";

interface DiscoverLink {
  icon: ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
}

const LINKS: DiscoverLink[] = [
  { icon: BookOpen, label: "Lexicon", description: "Searchable whisky dictionary", href: "/labs/discover/lexicon", testId: "labs-link-discover-lexicon" },
  { icon: Building2, label: "Distilleries", description: "Distillery encyclopedia & map", href: "/labs/discover/distilleries", testId: "labs-link-discover-distilleries" },
  { icon: Package, label: "Bottlers", description: "Independent bottlers database", href: "/labs/discover/bottlers", testId: "labs-link-discover-bottlers" },
  { icon: FileText, label: "Templates", description: "Tasting vocabulary templates", href: "/labs/discover/templates", testId: "labs-link-discover-templates" },
  { icon: Map, label: "Tasting Guide", description: "Step-by-step tasting guide", href: "/labs/discover/guide", testId: "labs-link-discover-guide" },
  { icon: FlaskConical, label: "Research", description: "Science of perception & bibliography", href: "/labs/discover/research", testId: "labs-link-discover-research" },
  { icon: BookMarked, label: "Rabbit Hole", description: "Rating models, statistics & deep dives", href: "/labs/discover/rabbit-hole", testId: "labs-link-discover-rabbit-hole" },
  { icon: MessageSquare, label: "Vocabulary", description: "Copy-paste vocabulary cards", href: "/labs/discover/vocabulary", testId: "labs-link-discover-vocabulary" },
];

export default function LabsDiscover() {
  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-discover-page">
      <Link href="/labs" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-discover">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </Link>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
          <Compass style={{ width: 24, height: 24, color: "var(--labs-accent)" }} strokeWidth={1.8} />
          <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-discover-title">
            Discover
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: 0 }}>
          Knowledge, guides & research — all in one place.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {LINKS.map((link) => (
          <Link key={link.testId} href={link.href} style={{ textDecoration: "none" }}>
            <div className="labs-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} data-testid={link.testId}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <link.icon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                  {link.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 1 }}>
                  {link.description}
                </div>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
