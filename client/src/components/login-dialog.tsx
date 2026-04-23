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

  const handleDismiss = useCallback(() => {
    let returnFrom: string | null = null;
    try {
      returnFrom = sessionStorage.getItem("returnFrom");
      sessionStorage.removeItem("returnFrom");
      sessionStorage.removeItem("returnTo");
    } catch {}
    onClose();
    if (returnFrom && returnFrom.startsWith("/labs/")) {
      navigate(returnFrom);
    }
  }, [onClose, navigate]);

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
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
        <AuthFlowPanel
          dialogMode
          initialTab={authDialogTab}
          onSuccess={handleSuccess}
          onClose={handleDismiss}
          showOpenOnPageLink
        />
      </DialogContent>
    </Dialog>
  );
}
