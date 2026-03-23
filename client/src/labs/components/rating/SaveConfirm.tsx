import { CheckIcon } from "./icons";

interface SaveConfirmProps {
  show: boolean;
  color: string;
}

export default function SaveConfirm({ show, color }: SaveConfirmProps) {
  if (!show) return null;

  return (
    <div
      data-testid="save-confirm-overlay"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        pointerEvents: "none",
      }}
    >
      <div
        className="labs-save-flash"
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${color} 22%, transparent)`,
          border: `2px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CheckIcon color={color} size={32} />
      </div>
    </div>
  );
}
