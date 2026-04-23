import { useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { useLocation } from "wouter";
import { AuthFlowPanel } from "@/components/auth-flow-panel";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { authDialogTab } = useAppStore();
  const [, navigate] = useLocation();

  const handleSuccess = useCallback(
    (returnTo: string | null) => {
      onClose();
      if (returnTo && returnTo.startsWith("/labs/")) {
        navigate(returnTo);
      }
    },
    [onClose, navigate],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
        <AuthFlowPanel
          dialogMode
          initialTab={authDialogTab}
          onSuccess={handleSuccess}
          onClose={onClose}
          showOpenOnPageLink
        />
      </DialogContent>
    </Dialog>
  );
}
