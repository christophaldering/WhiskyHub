import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { reflectionApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BookOpen, Send, Lock, Eye, EyeOff } from "lucide-react";
import type { Tasting } from "@shared/schema";

interface Reflection {
  id: string;
  tastingId: string;
  participantId: string;
  participantName: string;
  promptText: string;
  text: string;
  isAnonymous: boolean;
  createdAt: string;
}

export default function ReflectionPanel({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [anonymousFlags, setAnonymousFlags] = useState<Record<string, boolean>>({});
  const isOpen = tasting.status === "open";

  const prompts: string[] =
    tasting.reflectionMode === "custom" && tasting.customPrompts
      ? (() => {
          try {
            return JSON.parse(tasting.customPrompts) as string[];
          } catch {
            return [];
          }
        })()
      : [
          t("reflection.prompt1"),
          t("reflection.prompt2"),
          t("reflection.prompt3"),
          t("reflection.prompt4"),
        ];

  const { data: allReflections = [] } = useQuery<Reflection[]>({
    queryKey: ["reflections", tasting.id],
    queryFn: () => reflectionApi.getAll(tasting.id),
    refetchInterval: 5000,
    enabled: isOpen,
  });

  const { data: myReflections = [] } = useQuery<Reflection[]>({
    queryKey: ["reflections", tasting.id, "mine", currentParticipant?.id],
    queryFn: () => reflectionApi.getMine(tasting.id, currentParticipant!.id),
    enabled: isOpen && !!currentParticipant,
  });

  const postMutation = useMutation({
    mutationFn: (data: { promptText: string; text: string; isAnonymous?: boolean }) =>
      reflectionApi.post(tasting.id, {
        participantId: currentParticipant!.id,
        promptText: data.promptText,
        text: data.text,
        isAnonymous: data.isAnonymous,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reflections", tasting.id] });
      queryClient.invalidateQueries({ queryKey: ["reflections", tasting.id, "mine", currentParticipant?.id] });
    },
  });

  const handleSubmit = (promptText: string) => {
    const text = responses[promptText]?.trim();
    if (!text || !currentParticipant) return;

    const isAnonymous =
      tasting.reflectionVisibility === "anonymous"
        ? true
        : tasting.reflectionVisibility === "optional"
          ? !!anonymousFlags[promptText]
          : false;

    postMutation.mutate(
      { promptText, text, isAnonymous },
      {
        onSuccess: () => {
          setResponses((prev) => {
            const next = { ...prev };
            delete next[promptText];
            return next;
          });
        },
      }
    );
  };

  if (!tasting.reflectionEnabled) return null;

  const mySubmittedPrompts = new Set(myReflections.map((r) => r.promptText));

  return (
    <div className="bg-card border border-border/50 shadow-sm p-6 rounded-lg" data-testid="reflection-panel">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-serif text-lg font-semibold" data-testid="reflection-title">
          {t("reflection.title")}
        </h3>
      </div>
      <p className="text-muted-foreground text-sm font-serif mb-4" data-testid="reflection-subtitle">
        {t("reflection.subtitle")}
      </p>

      {!isOpen ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center" data-testid="reflection-locked">
          <Lock className="h-4 w-4" />
          <span className="font-serif text-sm">{t("reflection.locked")}</span>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6" data-testid="reflection-prompts">
            {prompts.map((prompt, index) => {
              const submitted = mySubmittedPrompts.has(prompt);
              const myReflection = myReflections.find((r) => r.promptText === prompt);

              return (
                <div key={index} className="space-y-2" data-testid={`reflection-prompt-${index}`}>
                  <p className="font-serif text-sm font-medium text-foreground">{prompt}</p>

                  {submitted && myReflection ? (
                    <div className="flex items-start gap-2 bg-muted/50 rounded-md p-3" data-testid={`reflection-submitted-${index}`}>
                      <span className="text-green-600 mt-0.5">✓</span>
                      <p className="font-serif text-sm text-foreground/80">{myReflection.text}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        value={responses[prompt] || ""}
                        onChange={(e) =>
                          setResponses((prev) => ({ ...prev, [prompt]: e.target.value }))
                        }
                        placeholder={prompt}
                        className="font-serif text-sm min-h-[80px]"
                        disabled={!currentParticipant || postMutation.isPending}
                        data-testid={`reflection-textarea-${index}`}
                      />

                      {tasting.reflectionVisibility === "optional" && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`anon-${index}`}
                            checked={!!anonymousFlags[prompt]}
                            onCheckedChange={(checked) =>
                              setAnonymousFlags((prev) => ({ ...prev, [prompt]: !!checked }))
                            }
                            data-testid={`reflection-anonymous-checkbox-${index}`}
                          />
                          <Label htmlFor={`anon-${index}`} className="font-serif text-sm text-muted-foreground cursor-pointer">
                            {t("reflection.postAnonymously")}
                          </Label>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSubmit(prompt)}
                        disabled={!responses[prompt]?.trim() || !currentParticipant || postMutation.isPending}
                        data-testid={`reflection-submit-${index}`}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {t("reflection.submit")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {allReflections.length > 0 && (
            <div className="border-t border-border/50 pt-4" data-testid="reflection-all">
              <h4 className="font-serif text-sm font-semibold mb-3 text-muted-foreground">
                {t("reflection.allReflections")}
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {allReflections.map((ref) => (
                  <div key={ref.id} className="space-y-0.5" data-testid={`reflection-entry-${ref.id}`}>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {ref.isAnonymous ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      <span className="font-serif font-medium">
                        {ref.isAnonymous ? "Anonymous" : ref.participantName}
                      </span>
                    </div>
                    <p className="font-serif text-xs text-muted-foreground italic">
                      {ref.promptText}
                    </p>
                    <p className="font-serif text-sm text-foreground/80">
                      {ref.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allReflections.length === 0 && myReflections.length === 0 && (
            <p className="text-muted-foreground text-sm font-serif text-center py-4" data-testid="reflection-empty">
              {t("reflection.noReflections")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
