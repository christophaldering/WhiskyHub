import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { t } = useTranslation();
  const { setParticipant } = useAppStore();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const participant = await participantApi.loginOrCreate(name.trim(), pin || undefined);
      setParticipant({ id: participant.id, name: participant.name, role: participant.role });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">Join CaskSense</DialogTitle>
          <DialogDescription>Enter your name to participate. Add a PIN to secure your profile.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary/20"
              data-testid="input-name"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">PIN (optional)</Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Optional 4-digit PIN"
              maxLength={6}
              className="bg-secondary/20"
              data-testid="input-pin"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
            data-testid="button-join"
          >
            {loading ? "Joining..." : "Enter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
