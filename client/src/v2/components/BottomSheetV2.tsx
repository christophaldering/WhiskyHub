import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface BottomSheetV2Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function BottomSheetV2({ open, onClose, title, children }: BottomSheetV2Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" data-testid="bottom-sheet">
      <div
        className="absolute inset-0 transition-opacity"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[90dvh] overflow-y-auto animate-slide-up"
        style={{
          background: "var(--v2-surface-elevated)",
          borderTopLeftRadius: "var(--v2-radius-lg)",
          borderTopRightRadius: "var(--v2-radius-lg)",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold" style={{ color: "var(--v2-text)" }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors"
            style={{ background: "var(--v2-surface)", color: "var(--v2-text-muted)" }}
            data-testid="bottom-sheet-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-4">{children}</div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
