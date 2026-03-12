import { useLocation } from "wouter";
import { Users, Mic, FlaskConical } from "lucide-react";

function GlencairnHero({ size = 48 }: { size?: number }) {
  const glass = "M8.8 5.5 h6.4 l.2 2.5 c.3 2 .5 3.8 .1 5.2 C15 15 13.8 16.2 12.8 17 L12 17.6 l-.8-.6 C10.2 16.2 9 15 8.5 13.2 8 11.8 8.3 10 8.6 8 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--labs-accent)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d={glass} />
      <line x1="10" y1="17.6" x2="14" y2="17.6" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="17.6" x2="12" y2="20" />
    </svg>
  );
}

const ACTIONS = [
  {
    key: "join",
    href: "/labs/join",
    icon: Users,
    title: "Join a Tasting",
    description: "Have a code from your host? Enter it here to join a live session.",
    testId: "labs-action-join",
    delay: "labs-stagger-1",
  },
  {
    key: "solo",
    href: "/labs/solo",
    icon: FlaskConical,
    title: "Taste Solo",
    description: "Log, rate, and reflect on whiskies at your own pace.",
    testId: "labs-action-solo",
    delay: "labs-stagger-2",
  },
  {
    key: "host",
    href: "/labs/host",
    icon: Mic,
    title: "Host a Session",
    description: "Set up and lead a structured tasting for your group.",
    testId: "labs-action-host",
    delay: "labs-stagger-3",
  },
] as const;

export default function LabsHome() {
  const [, navigate] = useLocation();

  return (
    <div className="px-5 py-10 max-w-lg mx-auto">
      <div className="flex flex-col items-center text-center mb-12 labs-fade-in">
        <GlencairnHero size={52} />
        <h1
          className="labs-serif text-3xl font-semibold mt-5 mb-3"
          style={{ color: "var(--labs-text)" }}
          data-testid="labs-home-title"
        >
          CaskSense <span style={{ fontWeight: 400, opacity: 0.65 }}>Labs</span>
        </h1>
        <p
          className="text-base leading-relaxed"
          style={{ color: "var(--labs-text-secondary)", maxWidth: 360 }}
          data-testid="labs-home-tagline"
        >
          A focused space for structured whisky tasting&nbsp;— blind&nbsp;or&nbsp;revealed, solo&nbsp;or&nbsp;together.
        </p>
      </div>

      <div className="space-y-4">
        {ACTIONS.map((action) => (
          <div
            key={action.key}
            className={`labs-card labs-card-interactive p-6 labs-fade-in ${action.delay}`}
            onClick={() => navigate(action.href)}
            data-testid={action.testId}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--labs-accent-muted)" }}
              >
                <action.icon className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-lg font-semibold mb-1"
                  style={{ color: "var(--labs-text)" }}
                >
                  {action.title}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--labs-text-muted)" }}
                >
                  {action.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p
        className="text-center text-xs mt-10 labs-fade-in labs-stagger-4"
        style={{ color: "var(--labs-text-muted)", opacity: 0.6 }}
        data-testid="labs-home-footer"
      >
        Refined · Structured · Thoughtful
      </p>
    </div>
  );
}
