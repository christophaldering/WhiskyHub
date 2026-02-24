import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string | ReactNode;
  primaryAction?: ReactNode;
  children: ReactNode;
  testId?: string;
  className?: string;
}

export function PageLayout({
  icon: Icon,
  title,
  subtitle,
  primaryAction,
  children,
  testId,
  className,
}: PageLayoutProps) {
  return (
    <div
      className={cn("max-w-5xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden", className)}
      data-testid={testId}
    >
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
      {children}
    </div>
  );
}
