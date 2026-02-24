import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { inviteApi } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [accepted, setAccepted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => inviteApi.getByToken(token!),
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: () => inviteApi.accept(token!, currentParticipant!.id),
    onSuccess: (result: any) => {
      setAccepted(true);
      setTimeout(() => navigate(`/tasting/${result.tastingId}`), 1500);
    },
  });

  useEffect(() => {
    if (currentParticipant && data?.invite && !accepted) {
      acceptMutation.mutate();
    }
  }, [currentParticipant, data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.invite) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-serif font-bold mb-2">Invitation Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This invitation link may have expired or already been used.
            </p>
            <Button onClick={() => navigate("/tasting")} data-testid="button-go-home">
              Go to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <h2 className="text-xl font-serif font-bold text-center">{t("app.name")}</h2>
            <p className="text-xs text-center uppercase tracking-widest text-muted-foreground">{t("app.tagline")}</p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You've been invited to <strong>{data.tasting?.title}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Please log in from the lobby first, then return to this link.
            </p>
            <Button onClick={() => navigate("/tasting")} data-testid="button-go-lobby">
              Go to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-serif font-bold mb-2">Invitation Accepted</h2>
            <p className="text-sm text-muted-foreground">
              Joining {data.tasting?.title}...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Accepting invitation...</p>
        </CardContent>
      </Card>
    </div>
  );
}
