import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { discussionApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, Lock } from "lucide-react";
import { useInputFocused } from "@/hooks/use-input-focused";
import type { Tasting } from "@shared/schema";

interface DiscussionMessage {
  id: string;
  tastingId: string;
  participantId: string;
  participantName: string;
  text: string;
  createdAt: string;
}

function timeAgo(dateStr: string, justNowLabel: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return justNowLabel;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export default function DiscussionPanel({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOpen = tasting.status === "open";
  const inputFocused = useInputFocused();

  const { data: messages = [] } = useQuery<DiscussionMessage[]>({
    queryKey: ["discussions", tasting.id],
    queryFn: () => discussionApi.get(tasting.id),
    refetchInterval: inputFocused ? false : 3000,
    enabled: isOpen,
  });

  const postMutation = useMutation({
    mutationFn: (msg: string) =>
      discussionApi.post(tasting.id, currentParticipant!.id, msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussions", tasting.id] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !currentParticipant) return;
    postMutation.mutate(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-card border border-border/50 shadow-sm p-6 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-serif text-lg font-semibold" data-testid="discussion-title">
          {t("discussion.title")}
        </h3>
      </div>

      {!isOpen ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center" data-testid="discussion-locked">
          <Lock className="h-4 w-4" />
          <span className="font-serif text-sm">{t("discussion.locked")}</span>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="max-h-64 overflow-y-auto space-y-3 mb-4"
            data-testid="discussion-messages"
          >
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-sm font-serif text-center py-6" data-testid="discussion-empty">
                {t("discussion.empty")}
              </p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex items-baseline gap-2 text-sm" data-testid={`discussion-message-${msg.id}`}>
                  <span className="font-serif font-bold text-foreground shrink-0">
                    {msg.participantName}
                  </span>
                  <span className="font-serif text-foreground/80 break-words min-w-0">
                    {msg.text}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                    {timeAgo(msg.createdAt, t("discussion.justNow"))}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("discussion.placeholder")}
              className="font-serif text-sm"
              disabled={!currentParticipant || postMutation.isPending}
              data-testid="discussion-input"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleSend}
              disabled={!text.trim() || !currentParticipant || postMutation.isPending}
              data-testid="discussion-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
