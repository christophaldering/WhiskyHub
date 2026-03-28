import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface RosterEntry {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  favoriteWhisky: string | null;
  goToDram: string | null;
  preferredRegions: string | null;
  preferredPeatLevel: string | null;
  preferredCaskType: string | null;
}

interface ProfileCardDialogProps {
  participant: RosterEntry | null;
  open: boolean;
  onClose: () => void;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileCardDialog({ participant, open, onClose }: ProfileCardDialogProps) {
  const { t } = useTranslation();

  if (!participant) return null;

  const hasPreferences =
    participant.preferredRegions ||
    participant.preferredPeatLevel ||
    participant.preferredCaskType;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto" data-testid="dialog-profile-card">
        <DialogHeader>
          <DialogTitle className="sr-only">{participant.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-24 w-24" data-testid={`avatar-profile-${participant.id}`}>
            {participant.photoUrl && (
              <AvatarImage src={participant.photoUrl} alt={participant.name} />
            )}
            <AvatarFallback className="text-2xl font-serif bg-primary/10 text-primary">
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>

          <h2 className="font-serif text-2xl font-bold text-primary" data-testid={`text-profile-name-${participant.id}`}>
            {participant.name}
          </h2>

          {participant.bio && (
            <p className="text-sm text-muted-foreground italic max-w-[280px]" data-testid={`text-profile-bio-${participant.id}`}>
              {participant.bio}
            </p>
          )}
        </div>

        {(participant.favoriteWhisky || participant.goToDram) && (
          <div className="space-y-3 border-t border-border/30 pt-4 mt-2">
            {participant.favoriteWhisky && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("profile.favoriteWhisky")}</p>
                <p className="font-serif text-sm text-foreground" data-testid={`text-profile-fav-${participant.id}`}>
                  {participant.favoriteWhisky}
                </p>
              </div>
            )}
            {participant.goToDram && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("profile.goToDram")}</p>
                <p className="font-serif text-sm text-foreground" data-testid={`text-profile-dram-${participant.id}`}>
                  {participant.goToDram}
                </p>
              </div>
            )}
          </div>
        )}

        {hasPreferences && (
          <div className="space-y-3 border-t border-border/30 pt-4">
            {participant.preferredRegions && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{t("profile.preferredRegions")}</p>
                <div className="flex flex-wrap gap-1.5" data-testid={`badges-regions-${participant.id}`}>
                  {participant.preferredRegions.split(",").map((r) => (
                    <Badge key={r.trim()} variant="secondary" className="text-xs font-serif">
                      {r.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {participant.preferredPeatLevel && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{t("profile.preferredPeatLevel")}</p>
                <Badge variant="outline" className="text-xs font-serif" data-testid={`badge-peat-${participant.id}`}>
                  {participant.preferredPeatLevel}
                </Badge>
              </div>
            )}
            {participant.preferredCaskType && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{t("profile.preferredCaskType")}</p>
                <Badge variant="outline" className="text-xs font-serif" data-testid={`badge-cask-${participant.id}`}>
                  {participant.preferredCaskType}
                </Badge>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
