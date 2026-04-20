import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Trash2, Plus, Loader2, ShieldAlert } from "lucide-react";

interface AliasRow {
  id: string;
  alias: string;
  createdAt: string | null;
}
interface DistilleryAliasGroup {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  aliases: AliasRow[];
}

export default function AdminDistilleryAliases() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const participantId = currentParticipant?.id || "";
  const [search, setSearch] = useState("");
  const [draftAliases, setDraftAliases] = useState<Record<string, string>>({});

  const queryKey = ["admin-distillery-aliases", participantId];
  const { data, isLoading, error } = useQuery<{ distilleries: DistilleryAliasGroup[] }>({
    queryKey,
    enabled: !!participantId && currentParticipant?.role === "admin",
    queryFn: async () => {
      const r = await fetch(`/api/admin/distillery-aliases?participantId=${encodeURIComponent(participantId)}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to load aliases");
      }
      return r.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (vars: { distilleryId: string; alias: string }) => {
      const r = await fetch(`/api/admin/distilleries/${vars.distilleryId}/aliases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, alias: vars.alias }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Failed to add alias");
      return j;
    },
    onSuccess: (_d, vars) => {
      setDraftAliases(prev => ({ ...prev, [vars.distilleryId]: "" }));
      queryClient.invalidateQueries({ queryKey });
      toast({ title: t("adminAliases.addedToast", { defaultValue: "Alias added" }) });
    },
    onError: (e: any) => toast({ title: t("adminAliases.errorTitle", { defaultValue: "Error" }), description: e?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (aliasId: string) => {
      const r = await fetch(`/api/admin/distillery-aliases/${aliasId}?participantId=${encodeURIComponent(participantId)}`, {
        method: "DELETE",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Failed to remove alias");
      return j;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: t("adminAliases.removedToast", { defaultValue: "Alias removed" }) });
    },
    onError: (e: any) => toast({ title: t("adminAliases.errorTitle", { defaultValue: "Error" }), description: e?.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    const rows = data?.distilleries || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.country || "").toLowerCase().includes(q) ||
      (d.region || "").toLowerCase().includes(q) ||
      d.aliases.some(a => a.alias.toLowerCase().includes(q))
    );
  }, [data, search]);

  if (!participantId || currentParticipant?.role !== "admin") {
    return (
      <div className="container mx-auto p-6 max-w-3xl" data-testid="page-admin-distillery-aliases">
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            <p className="text-sm">{t("adminAliases.adminOnly", { defaultValue: "Admin access required." })}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAliases = (data?.distilleries || []).reduce((sum, d) => sum + d.aliases.length, 0);

  return (
    <div className="container mx-auto p-6 max-w-5xl" data-testid="page-admin-distillery-aliases">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm" data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("adminAliases.backToAdmin", { defaultValue: "Back to admin" })}
          </Button>
        </Link>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-serif text-primary" data-testid="text-aliases-title">
          {t("adminAliases.title", { defaultValue: "Distillery name aliases" })}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("adminAliases.subtitle", { defaultValue: "Teach the importer that two spellings refer to the same distillery." })}
        </p>
        <p className="text-xs text-muted-foreground mt-2" data-testid="text-aliases-counts">
          {t("adminAliases.counts", {
            defaultValue: "{{distilleries}} distilleries · {{aliases}} aliases",
            distilleries: data?.distilleries?.length || 0,
            aliases: totalAliases,
          })}
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("adminAliases.searchPlaceholder", { defaultValue: "Search distilleries or aliases..." })}
          className="pl-9"
          data-testid="input-aliases-search"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 p-6 justify-center text-sm text-muted-foreground" data-testid="text-aliases-loading">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("adminAliases.loading", { defaultValue: "Loading..." })}
        </div>
      )}

      {error && (
        <Card className="border-destructive mb-4">
          <CardContent className="p-4 text-sm text-destructive" data-testid="text-aliases-error">
            {(error as Error).message}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map(d => {
          const draft = draftAliases[d.id] || "";
          const submit = () => {
            if (!draft.trim()) return;
            addMutation.mutate({ distilleryId: d.id, alias: draft });
          };
          return (
            <Card key={d.id} data-testid={`card-distillery-${d.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-base font-semibold" data-testid={`text-distillery-name-${d.id}`}>{d.name}</span>
                      {d.region && <Badge variant="outline" className="text-[10px]">{d.region}</Badge>}
                      {d.country && <Badge variant="outline" className="text-[10px]">{d.country}</Badge>}
                      <Badge variant="secondary" className="text-[10px]" data-testid={`badge-alias-count-${d.id}`}>
                        {t("adminAliases.aliasCount", { defaultValue: "{{count}} aliases", count: d.aliases.length })}
                      </Badge>
                    </div>
                  </div>
                </div>

                {d.aliases.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.aliases.map(a => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/40 text-xs"
                        data-testid={`item-alias-${a.id}`}
                      >
                        <code className="font-mono" data-testid={`text-alias-${a.id}`}>{a.alias}</code>
                        <button
                          onClick={() => deleteMutation.mutate(a.id)}
                          disabled={deleteMutation.isPending}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                          data-testid={`button-remove-alias-${a.id}`}
                          title={t("adminAliases.remove", { defaultValue: "Remove" })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <Input
                    value={draft}
                    onChange={e => setDraftAliases(prev => ({ ...prev, [d.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                    placeholder={t("adminAliases.addPlaceholder", { defaultValue: "Add alias (e.g. 'Glen Garioch')" })}
                    className="text-sm"
                    data-testid={`input-add-alias-${d.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={submit}
                    disabled={!draft.trim() || addMutation.isPending}
                    data-testid={`button-add-alias-${d.id}`}
                  >
                    {addMutation.isPending && addMutation.variables?.distilleryId === d.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Plus className="w-4 h-4" />}
                    <span className="ml-1">{t("adminAliases.addButton", { defaultValue: "Add" })}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!isLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground" data-testid="text-aliases-empty">
              {t("adminAliases.empty", { defaultValue: "No distilleries match your search." })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
