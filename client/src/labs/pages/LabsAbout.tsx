import { useTranslation } from "react-i18next";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { Heart, Info, ChevronLeft, ExternalLink } from "lucide-react";
import { useIsEmbeddedInExplore } from "@/labs/embeddedExploreContext";
import authorPhoto from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771448218726.png";

const HOSPIZ_NAME = "Christina-Kleintjes-Hospiz-Stiftung";
const HOSPIZ_URL = "https://c-kleintjes-hospiz-stiftung.de";

type Block =
  | { kind: "heading"; icon: string; text: string }
  | { kind: "p"; text: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "triptych"; items: { icon: string; word: string; gloss: string }[] }
  | { kind: "cooper"; name: string; question: string; caption: string }
  | { kind: "chips"; items: string[] }
  | { kind: "claim"; main: string; claim: string; dram: string };

function AboutIcon({ name, size = 19 }: { name: string; size?: number }) {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "eye":
      return (<svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
    case "barrel":
      return (<svg {...common}><rect x="5" y="3" width="14" height="18" rx="4" /><path d="M4 9h16M4 15h16" /></svg>);
    case "scent":
      return (<svg {...common}><path d="M4 8c4 0 4 2.5 8 2.5S16 8 20 8" /><path d="M4 13c4 0 4 2.5 8 2.5S16 13 20 13" /><path d="M4 18c4 0 4 2.5 8 2.5" /></svg>);
    case "hammer":
      return (<svg {...common}><path d="M14 3l7 7-3.5 3.5L10.5 6.5z" /><path d="M11 7L3 15l3.5 3.5 8-8" /></svg>);
    case "chart":
      return (<svg {...common}><path d="M3 3v18h18" /><path d="M7 14l3-4 3 3 5-7" /></svg>);
    case "message":
      return (<svg {...common}><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20l1-5.5A8.5 8.5 0 1 1 21 11.5Z" /></svg>);
    default:
      return (<svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>);
  }
}

const FD = "'Playfair Display', Georgia, serif";
const FM = "'Cormorant Garamond', Georgia, serif";
const FU = "'DM Sans', system-ui, sans-serif";

export default function LabsAbout() {
  const { t, i18n } = useTranslation();
  const goBackToDiscover = useBackNavigation("/labs/explore");
  const blocks = t("about.blocks", { returnObjects: true }) as Block[];
  const embedded = useIsEmbeddedInExplore();
  const isDE = (i18n.language || "de").startsWith("de");

  const switchLang = (lang: string) => {
    const y = window.scrollY;
    i18n.changeLanguage(lang).then(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  };

  return (
    <div className={embedded ? "labs-fade-in cs-about" : "labs-page labs-fade-in cs-about"} data-testid="labs-about-page">
      <style>{`
        .cs-about .ab-body{font-family:${FU};font-size:15.5px;line-height:1.75;color:var(--labs-text-secondary);margin:0 0 14px;}
        .cs-about .ab-sechead{display:flex;align-items:center;gap:11px;margin:34px 0 14px;}
        .cs-about .ab-badge{width:38px;height:38px;border-radius:50%;background:var(--labs-accent-muted);border:1px solid rgba(201,167,108,0.3);display:flex;align-items:center;justify-content:center;color:var(--labs-accent);flex-shrink:0;}
        .cs-about .ab-h2{font-family:${FD};font-size:21px;font-weight:600;color:var(--labs-accent);margin:0;line-height:1.25;}
        .cs-about .ab-pull{margin:22px 0;padding:18px 20px 18px 22px;border-left:3px solid var(--labs-accent);background:linear-gradient(90deg,var(--labs-accent-glow),transparent);border-radius:0 12px 12px 0;}
        .cs-about .ab-pull p{font-family:${FM};font-style:italic;font-size:20px;line-height:1.45;color:var(--labs-text);margin:0;}
        .cs-about .ab-pull p + p{margin-top:4px;}
        .cs-about .ab-tri-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:18px 0 6px;}
        .cs-about .ab-tri{background:var(--labs-surface);border:1px solid var(--labs-border);border-radius:14px;padding:16px 8px;text-align:center;}
        .cs-about .ab-tri-ring{width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(201,167,108,0.4);display:flex;align-items:center;justify-content:center;color:var(--labs-accent);margin:0 auto 9px;}
        .cs-about .ab-tri-w{font-family:${FD};font-size:15px;font-weight:600;color:var(--labs-text);}
        .cs-about .ab-tri-g{font-family:${FU};font-size:10.5px;color:var(--labs-text-muted);margin-top:3px;}
        .cs-about .ab-cooper{margin:18px 0;background:var(--labs-surface);border:1px solid var(--labs-border);border-radius:16px;padding:18px;}
        .cs-about .ab-coopline{display:flex;gap:11px;align-items:flex-start;}
        .cs-about .ab-coopdot{width:30px;height:30px;border-radius:50%;background:var(--labs-accent-muted);border:1px solid rgba(201,167,108,0.4);display:flex;align-items:center;justify-content:center;color:var(--labs-accent);flex-shrink:0;}
        .cs-about .ab-coopname{font-family:${FU};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--labs-accent);opacity:0.85;margin-bottom:3px;}
        .cs-about .ab-coopq{font-family:${FM};font-style:italic;font-size:18px;line-height:1.4;color:var(--labs-text);}
        .cs-about .ab-coopcap{font-family:${FU};font-size:11.5px;line-height:1.6;color:var(--labs-text-muted);margin:13px 0 0;padding-top:13px;border-top:1px solid var(--labs-border-subtle,var(--labs-border));}
        .cs-about .ab-chips{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px;}
        .cs-about .ab-chip{font-family:${FU};font-size:12px;color:var(--labs-accent);background:var(--labs-accent-muted);border:1px solid rgba(201,167,108,0.3);border-radius:50px;padding:5px 13px;}
        .cs-about .ab-closing{text-align:center;margin:40px 0 8px;}
        .cs-about .ab-claim{font-family:${FM};font-style:italic;font-size:24px;color:var(--labs-accent);margin:0;}
        .cs-about .ab-dram{font-family:${FM};font-style:italic;font-size:18px;color:var(--labs-text-muted);margin:6px 0 0;}
      `}</style>

      <div className="flex items-center justify-between mb-2" style={{ gap: 12 }}>
        {!embedded ? (
          <button
            onClick={goBackToDiscover}
            className="labs-btn-ghost flex items-center gap-1 -ml-2"
            style={{ color: "var(--labs-text-muted)" }}
            data-testid="labs-about-back"
          >
            <ChevronLeft className="w-4 h-4" /> {t("common.back", "Zurück")}
          </button>
        ) : <span />}
        <div style={{ display: "flex", alignItems: "center" }} data-testid="labs-about-lang">
          <button
            onClick={() => switchLang("de")}
            data-testid="labs-about-lang-de"
            style={{
              padding: "6px 11px", borderRadius: "8px 0 0 8px", borderRight: "none",
              border: `1px solid ${isDE ? "rgba(201,167,108,0.45)" : "var(--labs-border)"}`,
              background: isDE ? "var(--labs-accent-muted)" : "transparent",
              color: isDE ? "var(--labs-accent)" : "var(--labs-text-muted)",
              fontFamily: FU, fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}
          >DE</button>
          <button
            onClick={() => switchLang("en")}
            data-testid="labs-about-lang-en"
            style={{
              padding: "6px 11px", borderRadius: "0 8px 8px 0",
              border: `1px solid ${!isDE ? "rgba(201,167,108,0.45)" : "var(--labs-border)"}`,
              background: !isDE ? "var(--labs-accent-muted)" : "transparent",
              color: !isDE ? "var(--labs-accent)" : "var(--labs-text-muted)",
              fontFamily: FU, fontSize: 12, fontWeight: 500, cursor: "pointer",
            }}
          >EN</button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-1">
        <Info className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-about-title">
          {t("about.title", "Über CaskSense")}
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)", fontFamily: FM, fontStyle: "italic", fontSize: 16 }}>
        {t("m2.discover.aboutSubtitle", "Die Geschichte hinter CaskSense")}
      </p>

      <div className="flex justify-center mb-2">
        <div className="max-w-[300px] w-full rounded-2xl overflow-hidden" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          <img src={authorPhoto} alt="Christoph Aldering & Sammy" className="w-full h-auto block" data-testid="labs-about-author-photo" />
        </div>
      </div>
      <p className="text-center mb-2" style={{ color: "var(--labs-text-muted)", fontSize: 11, fontFamily: FU, opacity: 0.85 }}>
        Christoph Aldering &amp; Sammy
      </p>

      <div>
        {Array.isArray(blocks) && blocks.map((b, i) => {
          if (b.kind === "heading") {
            return (
              <div className="ab-sechead" key={i} data-testid={`labs-about-block-${i}`}>
                <div className="ab-badge"><AboutIcon name={b.icon} /></div>
                <h2 className="ab-h2">{b.text}</h2>
              </div>
            );
          }
          if (b.kind === "p") {
            return <p className="ab-body" key={i} data-testid={`labs-about-block-${i}`}>{b.text}</p>;
          }
          if (b.kind === "quote") {
            return (
              <div className="ab-pull" key={i} data-testid={`labs-about-block-${i}`}>
                {b.lines.map((l, j) => <p key={j}>{l}</p>)}
              </div>
            );
          }
          if (b.kind === "triptych") {
            return (
              <div className="ab-tri-grid" key={i} data-testid={`labs-about-block-${i}`}>
                {b.items.map((it, j) => (
                  <div className="ab-tri" key={j}>
                    <div className="ab-tri-ring"><AboutIcon name={it.icon} size={20} /></div>
                    <div className="ab-tri-w">{it.word}</div>
                    <div className="ab-tri-g">{it.gloss}</div>
                  </div>
                ))}
              </div>
            );
          }
          if (b.kind === "cooper") {
            return (
              <div className="ab-cooper" key={i} data-testid={`labs-about-block-${i}`}>
                <div className="ab-coopline">
                  <div className="ab-coopdot"><AboutIcon name="message" size={16} /></div>
                  <div>
                    <div className="ab-coopname">{b.name}</div>
                    <div className="ab-coopq">{b.question}</div>
                  </div>
                </div>
                <p className="ab-coopcap">{b.caption}</p>
              </div>
            );
          }
          if (b.kind === "chips") {
            return (
              <div className="ab-chips" key={i} data-testid={`labs-about-block-${i}`}>
                {b.items.map((c, j) => <span className="ab-chip" key={j}>{c}</span>)}
              </div>
            );
          }
          if (b.kind === "claim") {
            return (
              <div className="ab-closing" key={i} data-testid={`labs-about-block-${i}`}>
                <p className="ab-body" style={{ textAlign: "center" }}>{b.main}</p>
                <p className="ab-claim">{b.claim}</p>
                <p className="ab-dram">{b.dram}</p>
              </div>
            );
          }
          return null;
        })}
      </div>

      <p className="labs-serif text-right text-sm font-semibold mt-5" style={{ color: "var(--labs-accent)", fontFamily: FM, fontSize: 17 }} data-testid="labs-about-signature">
        — Christoph Aldering
      </p>

      <div className="labs-card p-4 mt-5" data-testid="labs-about-contact">
        <h3 className="labs-serif text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--labs-accent)" }}>
          <Info className="w-4 h-4" /> {t("about.contactTitle", "Kontakt & Feedback")}
        </h3>
        <p className="text-xs mb-1.5" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>{t("about.contactNotice")}</p>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }}>{t("about.contactFeedback")}</p>
        <div className="flex flex-wrap gap-3">
          <a href={`mailto:${t("about.contactEmail")}`} className="text-xs" style={{ color: "var(--labs-accent)", textDecoration: "none" }} data-testid="labs-about-email">
            {t("about.contactEmail")}
          </a>
          <a href={t("about.contactLinkedInUrl")} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--labs-accent)", textDecoration: "none" }} data-testid="labs-about-linkedin">
            {t("about.contactLinkedIn")}
          </a>
        </div>
      </div>

      <div id="support" className="labs-card p-4 mt-5" data-testid="labs-about-support">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <h3 className="labs-serif text-sm font-semibold" style={{ color: "var(--labs-accent)" }}>
            {t("about.supportTitle", "Projekt unterstützen")}
          </h3>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)", lineHeight: 1.6 }} data-testid="labs-about-support-intro">
          {t("about.supportIntro")}
        </p>
        <a href={HOSPIZ_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs mb-3" style={{ color: "var(--labs-accent)", textDecoration: "none" }} data-testid="labs-about-hospiz-link">
          {HOSPIZ_NAME} <ExternalLink className="w-3 h-3" />
        </a>
        <div className="flex justify-center w-full mt-3" data-testid="labs-about-paypal">
          <div className="w-full max-w-[382px]">
            <iframe
              src="https://www.paypal.com/giving/campaigns?campaign_id=XGB4YN3CQEMFE"
              title={t("m2.discover.donatePaypalTitle", "PayPal donate")}
              frameBorder="0"
              width="100%"
              height={550}
              scrolling="no"
              className="rounded-2xl border-none"
            />
          </div>
        </div>
        <p className="text-center text-[11px] italic mt-3" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }} data-testid="labs-about-disclaimer">
          {t("donate.disclaimer")}
        </p>
      </div>
    </div>
  );
}
