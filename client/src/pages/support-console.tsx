import { useState, useMemo } from "react";
import { BuildFooter } from "@/components/build-footer";

const PIN = import.meta.env.VITE_SUPPORT_PIN;

interface DeepLink {
  title: string;
  url: string;
}

interface LinkGroup {
  label: string;
  links: DeepLink[];
}

const LINK_GROUPS: LinkGroup[] = [
  {
    label: "Core",
    links: [
      { title: "Landing", url: "/" },
      { title: "Join Tasting", url: "/join/:code" },
      { title: "Naked Tasting", url: "/naked/:code" },
      { title: "Impressum", url: "/impressum" },
      { title: "Privacy", url: "/privacy" },
      { title: "Intro", url: "/intro" },
      { title: "Feature Tour", url: "/feature-tour" },
    ],
  },
  {
    label: "V2 App",
    links: [
      { title: "Home", url: "/app/home" },
      { title: "Sessions", url: "/app/sessions" },
      { title: "Session Detail", url: "/app/session/:id" },
      { title: "Discover", url: "/app/discover" },
      { title: "Cellar", url: "/app/cellar" },
      { title: "More / Settings", url: "/app/more" },
      { title: "Admin", url: "/app/admin" },
      { title: "Recap", url: "/app/recap/:id" },
      { title: "Invite Accept", url: "/app/invite/:token" },
    ],
  },
  {
    label: "Legacy — Tasting",
    links: [
      { title: "Home Dashboard", url: "/legacy/home" },
      { title: "Tasting Hub", url: "/legacy/tasting" },
      { title: "Sessions", url: "/legacy/tasting/sessions" },
      { title: "Calendar", url: "/legacy/tasting/calendar" },
      { title: "Host Dashboard", url: "/legacy/tasting/host" },
      { title: "Photo Tasting", url: "/legacy/photo-tasting" },
      { title: "Templates", url: "/legacy/tasting-templates" },
      { title: "Pairings", url: "/legacy/pairings" },
    ],
  },
  {
    label: "Legacy — Personal",
    links: [
      { title: "Journal", url: "/legacy/my/journal" },
      { title: "Collection", url: "/legacy/my/collection" },
      { title: "Wishlist", url: "/legacy/my/wishlist" },
      { title: "Flavor Profile", url: "/legacy/flavor-profile" },
      { title: "Flavor Wheel", url: "/legacy/flavor-wheel" },
      { title: "Badges", url: "/legacy/badges" },
      { title: "Profile", url: "/legacy/profile" },
      { title: "Account", url: "/legacy/profile/account" },
    ],
  },
  {
    label: "Legacy — Analysis",
    links: [
      { title: "Comparison", url: "/legacy/comparison" },
      { title: "Benchmark / Library", url: "/legacy/benchmark" },
      { title: "Analytics", url: "/legacy/analytics" },
      { title: "Data Export", url: "/legacy/data-export" },
      { title: "Whisky Database", url: "/legacy/discover/database" },
    ],
  },
  {
    label: "Legacy — Social",
    links: [
      { title: "Discover", url: "/legacy/discover" },
      { title: "Community", url: "/legacy/discover/community" },
      { title: "Friends", url: "/legacy/friends" },
      { title: "Taste Twins", url: "/legacy/taste-twins" },
      { title: "Community Rankings", url: "/legacy/community-rankings" },
      { title: "Leaderboard", url: "/legacy/leaderboard" },
      { title: "Recommendations", url: "/legacy/recommendations" },
    ],
  },
  {
    label: "Legacy — Knowledge",
    links: [
      { title: "Lexicon", url: "/legacy/lexicon" },
      { title: "Distilleries", url: "/legacy/discover/distilleries" },
      { title: "Distillery Map", url: "/legacy/distillery-map" },
      { title: "Bottlers", url: "/legacy/bottlers" },
      { title: "Research", url: "/legacy/research" },
    ],
  },
  {
    label: "Legacy — Info",
    links: [
      { title: "Help", url: "/legacy/profile/help" },
      { title: "About", url: "/legacy/about" },
      { title: "Features", url: "/legacy/features" },
      { title: "Method", url: "/legacy/method" },
      { title: "News", url: "/legacy/news" },
      { title: "Donate", url: "/legacy/donate" },
    ],
  },
  {
    label: "Admin / System",
    links: [
      { title: "Admin Panel (V2)", url: "/app/admin" },
      { title: "Admin Panel (Legacy)", url: "/legacy/admin" },
      { title: "Lab Dark — Home", url: "/lab-dark/home" },
      { title: "Lab Dark — Sessions", url: "/lab-dark/sessions" },
      { title: "Lab Dark — Discover", url: "/lab-dark/discover" },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.origin + text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      data-testid={`button-copy-${text.replace(/\//g, "-")}`}
      style={{
        background: copied ? "#d4a256" : "#2e2a24",
        color: copied ? "#1a1714" : "#d4a256",
        border: "1px solid #3a352e",
        borderRadius: 4,
        padding: "2px 10px",
        fontSize: 12,
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === PIN) {
      sessionStorage.setItem("casksense_support_unlocked", "1");
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a1714" }}>
      <form onSubmit={handleSubmit} style={{ textAlign: "center" }}>
        <h1 style={{ color: "#d4a256", fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 24 }}>
          Support Console
        </h1>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          autoFocus
          data-testid="input-support-pin"
          style={{
            background: "#242018",
            border: error ? "1px solid #c44" : "1px solid #3a352e",
            borderRadius: 6,
            color: "#f5f0e8",
            padding: "10px 16px",
            fontSize: 16,
            width: 180,
            textAlign: "center",
            letterSpacing: 4,
            outline: "none",
          }}
        />
        <div style={{ marginTop: 12 }}>
          <button
            type="submit"
            data-testid="button-support-unlock"
            style={{
              background: "#d4a256",
              color: "#1a1714",
              border: "none",
              borderRadius: 6,
              padding: "8px 28px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </div>
        {error && (
          <p style={{ color: "#c44", fontSize: 13, marginTop: 12 }} data-testid="text-access-denied">
            Access denied
          </p>
        )}
      </form>
    </div>
  );
}

export default function SupportConsole() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("casksense_support_unlocked") === "1");
  const [search, setSearch] = useState("");

  if (!PIN) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a1714" }}>
        <p style={{ color: "#666", fontSize: 14 }} data-testid="text-support-disabled">Disabled (no PIN set)</p>
      </div>
    );
  }

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  const query = search.toLowerCase().trim();

  const filteredGroups = useMemo(() => {
    if (!query) return LINK_GROUPS;
    return LINK_GROUPS
      .map((group) => ({
        ...group,
        links: group.links.filter(
          (link) =>
            link.title.toLowerCase().includes(query) ||
            link.url.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.links.length > 0);
  }, [query]);

  const totalLinks = filteredGroups.reduce((sum, g) => sum + g.links.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#1a1714", color: "#f5f0e8" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px" }}>
        <h1
          style={{ fontFamily: "'Playfair Display', serif", color: "#d4a256", fontSize: 22, marginBottom: 4 }}
          data-testid="text-support-title"
        >
          Support Console
        </h1>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>
          {totalLinks} deep links available
        </p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search routes..."
          data-testid="input-support-search"
          style={{
            width: "100%",
            background: "#242018",
            border: "1px solid #3a352e",
            borderRadius: 8,
            color: "#f5f0e8",
            padding: "10px 14px",
            fontSize: 14,
            outline: "none",
            marginBottom: 28,
            boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <h2
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  color: "#d4a256",
                  marginBottom: 8,
                }}
                data-testid={`text-group-${group.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              >
                {group.label}
              </h2>
              <div
                style={{
                  background: "#242018",
                  borderRadius: 10,
                  border: "1px solid #2e2a24",
                  overflow: "hidden",
                }}
              >
                {group.links.map((link, i) => (
                  <div
                    key={link.url}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      gap: 12,
                      borderTop: i > 0 ? "1px solid #2e2a24" : "none",
                    }}
                    data-testid={`row-link-${link.url.replace(/\//g, "-")}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#f5f0e8" }}>
                        {link.title}
                      </div>
                      <div style={{ fontSize: 12, fontFamily: "monospace", color: "#888", marginTop: 1 }}>
                        {link.url}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <CopyButton text={link.url} />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`link-open-${link.url.replace(/\//g, "-")}`}
                        style={{
                          background: "transparent",
                          color: "#d4a256",
                          border: "1px solid #3a352e",
                          borderRadius: 4,
                          padding: "2px 10px",
                          fontSize: 12,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <p style={{ color: "#666", textAlign: "center", fontSize: 14, marginTop: 32 }} data-testid="text-no-results">
              No routes matching "{search}"
            </p>
          )}
        </div>
      </div>
      <BuildFooter />
    </div>
  );
}
