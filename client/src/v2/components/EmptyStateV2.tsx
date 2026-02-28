import { LucideIcon } from "lucide-react";

interface EmptyStateV2Props {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export default function EmptyStateV2({ icon: Icon, title, description }: EmptyStateV2Props) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      data-testid="empty-state"
    >
      <div
        className="flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
        style={{ background: "var(--v2-accent-muted)", color: "var(--v2-accent)" }}
      >
        <Icon className="w-7 h-7" />
      </div>
      <h3
        className="text-base font-semibold mb-1"
        style={{ color: "var(--v2-text)" }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-sm max-w-xs"
          style={{ color: "var(--v2-text-muted)" }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
