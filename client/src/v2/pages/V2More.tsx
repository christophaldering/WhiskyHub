import { useLocation } from "wouter";
import {
  HelpCircle, Info, Globe, ChevronRight,
} from "lucide-react";
import { PageHeaderV2, CardV2, ListRowV2 } from "@/v2/components";
import { LucideIcon } from "lucide-react";

interface SettingsItem {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  route: string;
}

export default function V2More() {
  const [, navigate] = useLocation();

  const items: SettingsItem[] = [
    { icon: Globe, title: "Language", subtitle: "English / Deutsch", route: "/legacy/profile/account" },
    { icon: Info, title: "About", subtitle: "About CaskSense", route: "/legacy/about" },
    { icon: HelpCircle, title: "Support", subtitle: "FAQ & help", route: "/legacy/profile/help" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeaderV2 title="Settings" />

      <div className="px-5 space-y-6 pb-8">
        <CardV2>
          {items.map((item) => (
            <ListRowV2
              key={item.route}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              onClick={() => navigate(item.route)}
              trailing={
                <ChevronRight
                  className="w-4 h-4"
                  style={{ color: "var(--v2-text-muted)" }}
                />
              }
            />
          ))}
        </CardV2>

        <p
          className="text-center text-xs px-4"
          style={{ color: "var(--v2-text-muted)", opacity: 0.6 }}
          data-testid="text-advanced-hint"
        >
          Advanced features are available via direct links.
        </p>
      </div>
    </div>
  );
}
