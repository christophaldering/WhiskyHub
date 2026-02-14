import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { EvaluationForm } from "@/components/evaluation-form";
import { RevealView } from "@/components/reveal-view";
import { SessionControl } from "@/components/session-control";
import { LoginDialog } from "@/components/login-dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Whisky, Tasting } from "@shared/schema";

function AddWhiskyDialog({ tastingId }: { tastingId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", distillery: "", age: "", abv: "", type: "Single Malt",
    notes: "", category: "Single Malt", region: "", abvBand: "", ageBand: "",
    caskInfluence: "", peatLevel: "None",
  });

  const createWhisky = useMutation({
    mutationFn: (data: any) => whiskyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setOpen(false);
      setForm({ name: "", distillery: "", age: "", abv: "", type: "Single Malt", notes: "", category: "Single Malt", region: "", abvBand: "", ageBand: "", caskInfluence: "", peatLevel: "None" });
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    createWhisky.mutate({
      tastingId,
      name: form.name.trim(),
      distillery: form.distillery.trim() || null,
      age: form.age.trim() || null,
      abv: form.abv ? parseFloat(form.abv) : null,
      type: form.type || null,
      notes: form.notes.trim() || null,
      sortOrder: 0,
      category: form.category || null,
      region: form.region.trim() || null,
      abvBand: form.abvBand || null,
      ageBand: form.ageBand || null,
      caskInfluence: form.caskInfluence.trim() || null,
      peatLevel: form.peatLevel || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-add-whisky">
          <Plus className="w-4 h-4 mr-1" /> Add Expression
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">Add Expression</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Uigeadail" data-testid="input-whisky-name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Distillery</Label>
              <Input value={form.distillery} onChange={(e) => setForm(p => ({ ...p, distillery: e.target.value }))} placeholder="Ardbeg" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Age</Label>
              <Input value={form.age} onChange={(e) => setForm(p => ({ ...p, age: e.target.value }))} placeholder="NAS or 18" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">ABV %</Label>
              <Input type="number" value={form.abv} onChange={(e) => setForm(p => ({ ...p, abv: e.target.value }))} placeholder="46.0" step="0.1" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Malt">Single Malt</SelectItem>
                  <SelectItem value="Blended Malt">Blended Malt</SelectItem>
                  <SelectItem value="Blended">Blended</SelectItem>
                  <SelectItem value="Bourbon">Bourbon</SelectItem>
                  <SelectItem value="Rye">Rye</SelectItem>
                  <SelectItem value="Irish">Irish</SelectItem>
                  <SelectItem value="Japanese">Japanese</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t border-border/30 pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">Taxonomy</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Region</Label>
                <Input value={form.region} onChange={(e) => setForm(p => ({ ...p, region: e.target.value }))} placeholder="Islay, Speyside..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cask Influence</Label>
                <Input value={form.caskInfluence} onChange={(e) => setForm(p => ({ ...p, caskInfluence: e.target.value }))} placeholder="Sherry, Bourbon..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Peat Level</Label>
                <Select value={form.peatLevel} onValueChange={(v) => setForm(p => ({ ...p, peatLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Light">Light</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Age Band</Label>
                <Select value={form.ageBand} onValueChange={(v) => setForm(p => ({ ...p, ageBand: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NAS">NAS</SelectItem>
                    <SelectItem value="Young (3-9)">Young (3-9)</SelectItem>
                    <SelectItem value="Classic (10-17)">Classic (10-17)</SelectItem>
                    <SelectItem value="Mature (18-25)">Mature (18-25)</SelectItem>
                    <SelectItem value="Old (25+)">Old (25+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={createWhisky.isPending || !form.name.trim()} className="w-full bg-primary text-primary-foreground font-serif" data-testid="button-submit-whisky">
            {createWhisky.isPending ? "Adding..." : "Add to Flight"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TastingRoom() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [showLogin, setShowLogin] = useState(false);

  const { data: tasting, isLoading: tastingLoading } = useQuery({
    queryKey: ["tasting", id],
    queryFn: () => tastingApi.get(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const { data: whiskyList = [], isLoading: whiskiesLoading } = useQuery({
    queryKey: ["whiskies", id],
    queryFn: () => whiskyApi.getForTasting(id!),
    enabled: !!id,
  });

  const [activeWhiskyId, setActiveWhiskyId] = useState<string | null>(null);

  if (!currentParticipant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <LoginDialog open={showLogin || true} onClose={() => setShowLogin(false)} />
        <p className="text-muted-foreground font-serif">Please sign in to join this tasting session.</p>
      </div>
    );
  }

  if (tastingLoading || whiskiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif italic">Loading session...</p>
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif">Session not found.</p>
      </div>
    );
  }

  const activeWhisky = whiskyList.find((w: Whisky) => w.id === activeWhiskyId) || whiskyList[0];
  const isHost = tasting.hostId === currentParticipant.id;
  const showAnalytics = tasting.status === "reveal" || tasting.status === "archived";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <LoginDialog open={showLogin} onClose={() => setShowLogin(false)} />

      <header className="mb-8 border-b border-border/50 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-black text-primary tracking-tight">{tasting.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground font-serif italic mt-2 text-lg">
              <span>{tasting.location}</span>
              <span>•</span>
              <span>{new Date(tasting.date).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-muted-foreground">Code: {tasting.code}</span>
              <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium border border-border/50">
                {t(`session.status.${tasting.status}`)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Flight Navigation + Add Button */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex overflow-x-auto gap-3 flex-1 no-scrollbar items-center">
          {whiskyList.map((w: Whisky, idx: number) => (
            <button
              key={w.id}
              onClick={() => setActiveWhiskyId(w.id)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[60px] h-[60px] rounded-full border transition-all duration-500 relative",
                (activeWhisky?.id === w.id)
                  ? "bg-primary text-primary-foreground border-primary scale-110 shadow-lg z-10"
                  : "bg-background border-border hover:border-primary/50 text-muted-foreground"
              )}
              data-testid={`button-whisky-${w.id}`}
            >
              <span className="font-serif font-bold text-lg">{idx + 1}</span>
            </button>
          ))}
        </div>
        {isHost && (tasting.status === "draft" || tasting.status === "open") && (
          <AddWhiskyDialog tastingId={tasting.id} />
        )}
      </div>

      {whiskyList.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <p className="text-2xl font-serif text-muted-foreground">No expressions yet.</p>
          {isHost && (
            <p className="text-sm text-muted-foreground">Use "Add Expression" above to add whiskies to this flight.</p>
          )}
        </div>
      ) : activeWhisky ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeWhisky.id}-${tasting.status}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                {showAnalytics ? (
                  <RevealView whisky={activeWhisky} tasting={tasting} />
                ) : (
                  <EvaluationForm whisky={activeWhisky} tasting={tasting} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="hidden lg:block lg:col-span-4 space-y-8">
            <div className="sticky top-8 space-y-8">
              <div className="bg-card border border-border/50 shadow-sm p-8 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>
                <div className="w-40 h-40 mx-auto rounded-full bg-secondary/30 border border-secondary flex items-center justify-center mb-6">
                  <span className="text-6xl font-serif text-primary opacity-80">🥃</span>
                </div>
                <h3 className="font-serif text-3xl font-bold mb-2 text-primary">{activeWhisky.name}</h3>
                <p className="text-muted-foreground font-serif italic mb-6 text-lg">{activeWhisky.distillery || "Unknown"}</p>
                <div className="grid grid-cols-2 gap-4 text-left mt-8 pt-8 border-t border-border/30">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">ABV</span>
                    <span className="font-mono text-lg font-medium">{activeWhisky.abv ? `${activeWhisky.abv}%` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1">Age</span>
                    <span className="font-mono text-lg font-medium">{activeWhisky.age || "NAS"}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-4">
                <Button
                  variant="ghost"
                  onClick={() => { const idx = whiskyList.findIndex((w: Whisky) => w.id === activeWhisky.id); if (idx > 0) setActiveWhiskyId(whiskyList[idx-1].id); }}
                  disabled={whiskyList[0]?.id === activeWhisky.id}
                  className="flex-1 border border-border/50 hover:bg-secondary"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Prev
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { const idx = whiskyList.findIndex((w: Whisky) => w.id === activeWhisky.id); if (idx < whiskyList.length - 1) setActiveWhiskyId(whiskyList[idx+1].id); }}
                  disabled={whiskyList[whiskyList.length-1]?.id === activeWhisky.id}
                  className="flex-1 border border-border/50 hover:bg-secondary"
                >
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isHost && <SessionControl tasting={tasting} />}
    </div>
  );
}
