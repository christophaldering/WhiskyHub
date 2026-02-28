interface PageHeaderV2Props {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export default function PageHeaderV2({ title, subtitle, action }: PageHeaderV2Props) {
  return (
    <div className="flex items-start justify-between px-5 pt-6 pb-4">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--v2-text)" }}
          data-testid="page-title"
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm mt-1"
            style={{ color: "var(--v2-text-secondary)" }}
            data-testid="page-subtitle"
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
          style={{
            background: "var(--v2-accent)",
            color: "var(--v2-bg)",
          }}
          data-testid="page-action"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
