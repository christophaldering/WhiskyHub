import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type PageLayoutVariant = "default" | "narrow" | "immersive";

export interface PageTab {
  key: string;
  labelKey: string;
  fallback?: string;
  icon?: LucideIcon;
  badge?: string;
  disabled?: boolean;
  testId?: string;
}

interface PageLayoutProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string | ReactNode;
  primaryAction?: ReactNode;
  headerContent?: ReactNode;
  tabs?: PageTab[];
  activeTabKey?: string;
  onTabChange?: (key: string) => void;
  tabsTestId?: string;
  children: ReactNode;
  variant?: PageLayoutVariant;
  hideChrome?: boolean;
  testId?: string;
  className?: string;
}

const variantStyles: Record<PageLayoutVariant, string> = {
  default: "max-w-5xl mx-auto px-4 py-8",
  narrow: "max-w-2xl mx-auto px-4 py-8",
  immersive: "max-w-5xl mx-auto px-4 py-6",
};

export function PageLayout({
  icon: Icon,
  title,
  subtitle,
  primaryAction,
  headerContent,
  tabs,
  activeTabKey,
  onTabChange,
  tabsTestId,
  children,
  variant = "default",
  hideChrome = false,
  testId,
  className,
}: PageLayoutProps) {
  const { t } = useTranslation();

  if (hideChrome) {
    return (
      <div className={cn("min-w-0 overflow-x-hidden", className)} data-testid={testId}>
        {children}
      </div>
    );
  }

  const header = (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-7 h-7 text-primary flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {primaryAction && (
        <div className="flex-shrink-0">{primaryAction}</div>
      )}
    </div>
  );

  const gridColsMap: Record<number, string> = {
    2: "grid grid-cols-2",
    3: "grid grid-cols-3",
    4: "grid grid-cols-4",
    5: "grid grid-cols-5",
  };

  const tabsRow = tabs && tabs.length > 0 ? (
    <div className="overflow-x-auto -mx-4 px-4 pb-1 mb-4">
      <TabsList
        className={cn(
          "w-full",
          gridColsMap[tabs.length] || "inline-flex"
        )}
        data-testid={tabsTestId}
      >
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              disabled={tab.disabled}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-serif whitespace-nowrap"
              data-testid={tab.testId || `tab-${tab.key}`}
            >
              {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
              <span className={cn(TabIcon && "hidden sm:inline")}>
                {t(tab.labelKey, tab.fallback || tab.key)}
              </span>
              {tab.badge && (
                <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">
                  {tab.badge}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  ) : null;

  const containerClass = cn(
    variantStyles[variant],
    "min-w-0 overflow-x-hidden",
    className
  );

  if (tabs && tabs.length > 0) {
    return (
      <div className={containerClass} data-testid={testId}>
        {header}
        {headerContent && <div className="mb-6">{headerContent}</div>}
        <Tabs value={activeTabKey} onValueChange={onTabChange}>
          {tabsRow}
          {children}
        </Tabs>
      </div>
    );
  }

  return (
    <div className={containerClass} data-testid={testId}>
      {header}
      {headerContent && <div className="mb-6">{headerContent}</div>}
      {children}
    </div>
  );
}
