import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { rosterApi } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileCardDialog, type RosterEntry } from "@/components/profile-card-dialog";

interface AttendeeRosterProps {
  tastingId: string;
  hostId: string;
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

export function AttendeeRoster({ tastingId, hostId }: AttendeeRosterProps) {
  const { t } = useTranslation();
  const [selectedParticipant, setSelectedParticipant] = useState<RosterEntry | null>(null);

  const { data: roster = [] } = useQuery<RosterEntry[]>({
    queryKey: ["roster", tastingId],
    queryFn: () => rosterApi.get(tastingId),
    enabled: !!tastingId,
  });

  return (
    <div className="space-y-3" data-testid="attendee-roster">
      <h3 className="font-serif text-lg font-bold text-primary" data-testid="text-roster-title">
        {t("roster.title")}
      </h3>

      {roster.length === 0 ? (
        <p className="text-sm text-muted-foreground italic" data-testid="text-roster-empty">
          {t("roster.empty")}
        </p>
      ) : (
        <div className="space-y-1">
          {roster.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelectedParticipant(entry)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary/30 transition-colors text-left"
              data-testid={`button-roster-participant-${entry.id}`}
            >
              <Avatar className="h-8 w-8">
                {entry.photoUrl && (
                  <AvatarImage src={entry.photoUrl} alt={entry.name} />
                )}
                <AvatarFallback className="text-xs font-serif bg-primary/10 text-primary">
                  {getInitials(entry.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-serif truncate" data-testid={`text-roster-name-${entry.id}`}>
                {entry.name}
              </span>
              {entry.id === hostId && (
                <Badge variant="secondary" className="text-[10px] font-serif" data-testid={`badge-host-${entry.id}`}>
                  {t("roster.host")}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      <ProfileCardDialog
        participant={selectedParticipant}
        open={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
      />
    </div>
  );
}
