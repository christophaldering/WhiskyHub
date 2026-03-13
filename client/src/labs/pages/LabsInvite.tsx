import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { inviteApi } from "@/lib/api";
import { Loader2, CheckCircle, XCircle, Wine } from "lucide-react";

interface LabsInviteProps {
  params?: { token?: string };
}

export default function LabsInvite({ params }: LabsInviteProps) {
  const routeParams = useParams<{ token: string }>();
  const token = params?.token || routeParams?.token || "";
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const { currentParticipant } = useAppStore();
  const [accepted, setAccepted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => inviteApi.getByToken(token),
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: () => inviteApi.accept(token, currentParticipant!.id),
    onSuccess: (result: any) => {
      setAccepted(true);
      setTimeout(() => navigate(`/labs/tastings/${result.tastingId}`), 1500);
    },
  });

  useEffect(() => {
    if (currentParticipant && data?.invite && !accepted) {
      acceptMutation.mutate();
    }
  }, [currentParticipant, data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center labs-fade-in" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <Loader2
            className="w-8 h-8 animate-spin mx-auto mb-4"
            style={{ color: "var(--labs-accent)" }}
          />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.invite) {
    return (
      <div className="flex items-center justify-center labs-fade-in" style={{ minHeight: "60vh" }}>
        <div
          className="labs-card-elevated p-8 text-center max-w-md w-full mx-4"
        >
          <XCircle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "var(--labs-danger)" }}
          />
          <h2
            className="labs-serif text-lg font-bold mb-2"
            style={{ color: "var(--labs-text)" }}
          >
            Invitation Not Found
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
            This invitation link may have expired or already been used.
          </p>
          <button
            className="labs-btn-primary"
            onClick={goBack}
            data-testid="button-labs-invite-home"
          >
            Go to Tastings
          </button>
        </div>
      </div>
    );
  }

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center labs-fade-in" style={{ minHeight: "60vh" }}>
        <div className="labs-card-elevated p-8 text-center max-w-md w-full mx-4">
          <Wine
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "var(--labs-accent)" }}
          />
          <h2
            className="labs-serif text-lg font-bold mb-2"
            style={{ color: "var(--labs-text)" }}
          >
            Tasting Invitation
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--labs-text-muted)" }}>
            You've been invited to a tasting session. Please sign in to accept.
          </p>
          {data.invite.tastingTitle && (
            <p className="text-base font-semibold mb-6" style={{ color: "var(--labs-accent)" }}>
              {data.invite.tastingTitle}
            </p>
          )}
          <button
            className="labs-btn-primary"
            onClick={() => navigate("/labs")}
            data-testid="button-labs-invite-signin"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex items-center justify-center labs-fade-in" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <CheckCircle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "var(--labs-success)" }}
          />
          <h2
            className="labs-serif text-lg font-bold mb-2"
            style={{ color: "var(--labs-text)" }}
          >
            Invitation Accepted!
          </h2>
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
            Redirecting to the tasting...
          </p>
        </div>
      </div>
    );
  }

  if (acceptMutation.isError) {
    return (
      <div className="flex items-center justify-center labs-fade-in" style={{ minHeight: "60vh" }}>
        <div className="labs-card-elevated p-8 text-center max-w-md w-full mx-4">
          <XCircle
            className="w-12 h-12 mx-auto mb-4"
            style={{ color: "var(--labs-danger)" }}
          />
          <h2
            className="labs-serif text-lg font-bold mb-2"
            style={{ color: "var(--labs-text)" }}
          >
            Could Not Accept
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
            Something went wrong while accepting this invitation.
          </p>
          <button
            className="labs-btn-primary"
            onClick={() => acceptMutation.mutate()}
            data-testid="button-labs-invite-retry"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center labs-fade-in" style={{ minHeight: "60vh" }}>
      <div className="text-center">
        <Loader2
          className="w-8 h-8 animate-spin mx-auto mb-4"
          style={{ color: "var(--labs-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Accepting invitation...</p>
      </div>
    </div>
  );
}
