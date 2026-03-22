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
        className="labs-fade-in"
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `${color}38`,
          border: `2px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "labsFadeIn 300ms ease both",
        }}
      >
        <CheckIcon color={color} size={32} />
      </div>
    </div>
  );
}
