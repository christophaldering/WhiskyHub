import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import BackLink from "@/labs/components/BackLink";
import { BookOpen, Archive, Heart, ChevronLeft } from "lucide-react";
import type { ElementType } from "react";

interface HubLink {
  icon: ElementType;
  labelKey: string;
  labelFallback: string;
  descKey: string;
  descFallback: string;
  href: string;
  testId: string;
}

const LINKS: HubLink[] = [
  {
    icon: BookOpen,
    labelKey: "myTastePage.myDrams",
    labelFallback: "My Drams",
    descKey: "myTastePage.myDramsNavDesc",
    descFallback: "Your tasting diary",
    href: "/labs/taste/drams",
    testId: "labs-link-collection-hub-drams",
  },
  {
    icon: Archive,
    labelKey: "myTastePage.myBottles",
    labelFallback: "My Bottles",
    descKey: "myTastePage.myBottlesNavDesc",
    descFallback: "Your bottle collection with import",
    href: "/labs/taste/collection",
    testId: "labs-link-collection-hub-bottles",
  },
  {
    icon: Heart,
    labelKey: "myTastePage.myWishlist",
    labelFallback: "My Wishlist",
    descKey: "myTastePage.myWishlistNavDesc",
    descFallback: "Whiskies you want to try",
    href: "/labs/taste/wishlist",
    testId: "labs-link-collection-hub-wishlist",
  },
];

function Tile({ link, t }: { link: HubLink; t: (key: string, fallback: string) => string }) {
  return (
    <Link href={link.href} style={{ textDecoration: "none" }}>
      <div
        className="labs-card"
        data-testid={link.testId}
        style={{
          minHeight: 92,
          padding: "14px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          cursor: "pointer",
          height: "100%",
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <link.icon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.25 }}>
            {t(link.labelKey, link.labelFallback)}
          </div>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3, lineHeight: 1.35 }}>
            {t(link.descKey, link.descFallback)}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LabsCollectionHub() {
  const { t } = useTranslation();
  return (
    <div className="labs-page" data-testid="labs-collection-hub-page">
      <BackLink href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-collection-hub">
          <ChevronLeft className="w-4 h-4" /> {t("myTastePage.title", "My World")}
        </button>
      </BackLink>

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-collection-hub-title">
          {t("myTastePage.collectionHub.title", "My Collection")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("myTastePage.collectionHub.subtitle", "Your drams, bottles & wishlist")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {LINKS.map((link) => (
          <Tile key={link.testId} link={link} t={t} />
        ))}
      </div>
    </div>
  );
}
