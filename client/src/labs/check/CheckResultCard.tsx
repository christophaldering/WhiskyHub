import { useTranslation } from "react-i18next";
import { Wine, Users, BookOpen, Heart, ShoppingBag } from "lucide-react";
import { FONT } from "@/labs/components/rating/theme";
import type { CheckLookupResponse } from "./checkApi";

export default function CheckResultCard({ data }: { data: CheckLookupResponse }) {
  const { t } = useTranslation();
  const { whisky, community, personal } = data;

  const subtitleParts: string[] = [];
  if (whisky.distillery) subtitleParts.push(whisky.distillery);
  if (whisky.region) subtitleParts.push(whisky.region);
  if (typeof whisky.age === "number") subtitleParts.push(`${whisky.age} Jahre`);
  if (typeof whisky.abv === "number") subtitleParts.push(`${whisky.abv}% Vol.`);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
      data-testid="check-result-card"
    >
      <div
        style={{
          padding: "20px 16px",
          borderRadius: 16,
          border: "1px solid var(--labs-border)",
          background: "var(--labs-surface-elevated)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
        data-testid="check-result-whisky"
      >
        {whisky.imageUrl ? (
          <img
            src={whisky.imageUrl}
            alt={whisky.name}
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              objectFit: "cover",
              flexShrink: 0,
              background: "var(--labs-surface)",
            }}
            data-testid="check-result-whisky-image"
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "var(--labs-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--labs-accent)",
            }}
          >
            <Wine className="w-6 h-6" />
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 18,
              fontWeight: 600,
              color: "var(--labs-text)",
              lineHeight: 1.2,
            }}
            data-testid="check-result-whisky-name"
          >
            {whisky.name}
          </div>
          {subtitleParts.length > 0 && (
            <div
              style={{
                fontFamily: FONT.body,
                fontSize: 12,
                color: "var(--labs-text-secondary)",
                marginTop: 4,
              }}
              data-testid="check-result-whisky-subtitle"
            >
              {subtitleParts.join(" · ")}
            </div>
          )}
        </div>
      </div>

      <CommunityCard community={community} />
      <PersonalCard personal={personal} />
    </div>
  );
}

function CommunityCard({ community }: { community: CheckLookupResponse["community"] }) {
  const { t } = useTranslation();

  if (!community || community.ratingCount === 0 || community.avgOverall === null) {
    return (
      <Card
        icon={<Users className="w-4 h-4" />}
        title={t("check.community.title", "Community")}
        testid="check-result-community"
      >
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 13,
            color: "var(--labs-text-secondary)",
          }}
          data-testid="check-result-community-empty"
        >
          {t("check.community.empty", "Noch keine Community-Bewertungen.")}
        </div>
      </Card>
    );
  }

  const breakdown: string[] = [];
  if (community.avgNose !== null) {
    breakdown.push(`${t("check.breakdown.nose", "Nase")} ${community.avgNose}`);
  }
  if (community.avgTaste !== null) {
    breakdown.push(`${t("check.breakdown.taste", "Geschmack")} ${community.avgTaste}`);
  }
  if (community.avgFinish !== null) {
    breakdown.push(`${t("check.breakdown.finish", "Abgang")} ${community.avgFinish}`);
  }

  return (
    <Card
      icon={<Users className="w-4 h-4" />}
      title={t("check.community.title", "Community")}
      testid="check-result-community"
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 22,
          fontWeight: 600,
          color: "var(--labs-text)",
        }}
        data-testid="check-result-community-value"
      >
        {t("check.community.value", "Ø {{score}} · {{count}} Bewertungen", {
          score: community.avgOverall.toFixed(1),
          count: community.ratingCount,
        })}
      </div>
      {breakdown.length > 0 && (
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 12,
            color: "var(--labs-text-secondary)",
            marginTop: 6,
          }}
          data-testid="check-result-community-breakdown"
        >
          {breakdown.join(" · ")}
        </div>
      )}
    </Card>
  );
}

function PersonalCard({ personal }: { personal: CheckLookupResponse["personal"] }) {
  const { t } = useTranslation();

  if (!personal) {
    return (
      <Card
        icon={<BookOpen className="w-4 h-4" />}
        title={t("check.personal.title", "Deine Historie")}
        testid="check-result-personal"
      >
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 13,
            color: "var(--labs-text-secondary)",
          }}
          data-testid="check-result-personal-anonymous"
        >
          {t("check.personal.anonymous", "Melde dich an, um deine Historie zu sehen.")}
        </div>
      </Card>
    );
  }

  const rows: { key: string; label: string; value: string; icon: React.ReactNode }[] = [];

  if (personal.inCollection) {
    rows.push({
      key: "collection",
      icon: <ShoppingBag className="w-3.5 h-3.5" />,
      label: t("check.personal.inCollection", "In deiner Sammlung"),
      value: personal.collectionSince
        ? new Date(personal.collectionSince).toLocaleDateString()
        : t("check.personal.since.unknown", "Datum unbekannt"),
    });
  }

  if (personal.inWishlist) {
    rows.push({
      key: "wishlist",
      icon: <Heart className="w-3.5 h-3.5" />,
      label: t("check.personal.inWishlist", "Auf deiner Wunschliste"),
      value: personal.wishlistPriority
        ? t("check.personal.priority", "Priorität: {{p}}", { p: personal.wishlistPriority })
        : "",
    });
  }

  if (personal.myRatingCount > 0) {
    const avg = personal.myAvgOverall !== null ? personal.myAvgOverall.toFixed(1) : "—";
    rows.push({
      key: "ratings",
      icon: <BookOpen className="w-3.5 h-3.5" />,
      label: t("check.personal.myRatings", "Deine Bewertungen"),
      value: t("check.personal.myRatingsValue", "Ø {{avg}} · {{count}}×", {
        avg,
        count: personal.myRatingCount,
      }),
    });
  }

  if (rows.length === 0) {
    return (
      <Card
        icon={<BookOpen className="w-4 h-4" />}
        title={t("check.personal.title", "Deine Historie")}
        testid="check-result-personal"
      >
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 13,
            color: "var(--labs-text-secondary)",
          }}
          data-testid="check-result-personal-empty"
        >
          {t("check.personal.empty", "Diesen Whisky hast du noch nicht erfasst.")}
        </div>
      </Card>
    );
  }

  return (
    <Card
      icon={<BookOpen className="w-4 h-4" />}
      title={t("check.personal.title", "Deine Historie")}
      testid="check-result-personal"
    >
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
        data-testid="check-result-personal-rows"
      >
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: FONT.body,
              fontSize: 13,
              color: "var(--labs-text)",
            }}
            data-testid={`check-result-personal-${row.key}`}
          >
            <span style={{ color: "var(--labs-accent)", display: "inline-flex" }}>{row.icon}</span>
            <span style={{ flex: 1 }}>{row.label}</span>
            {row.value && (
              <span style={{ color: "var(--labs-text-secondary)", fontSize: 12 }}>{row.value}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Card({
  icon,
  title,
  testid,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: 14,
        border: "1px solid var(--labs-border)",
        background: "var(--labs-surface-elevated)",
      }}
      data-testid={testid}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--labs-accent)",
          marginBottom: 10,
          fontFamily: FONT.body,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
