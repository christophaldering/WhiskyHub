import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { UserPlus, Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { tastingApi, participantApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LoginDialog } from "@/components/login-dialog";
import { queryClient } from "@/lib/queryClient";

export default function Home() {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const [, navigate] = useLocation();

  const [joinCode, setJoinCode] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Create tasting state
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: tastings } = useQuery({
    queryKey: ["tastings"],
    queryFn: tastingApi.getAll,
  });

  const createTasting = useMutation({
    mutationFn: (data: any) => tastingApi.create(data),
    onSuccess: (tasting) => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      navigate(`/tasting/${tasting.id}`);
    },
  });

  const handleJoin = async () => {
    if (!currentParticipant) {
      setShowLogin(true);
      return;
    }
    if (!joinCode.trim()) return;
    setJoinError("");
    try {
      const tasting = await tastingApi.getByCode(joinCode.trim().toUpperCase());
      await tastingApi.join(tasting.id, currentParticipant.id);
      navigate(`/tasting/${tasting.id}`);
    } catch (e: any) {
      setJoinError(e.message || "Session not found");
    }
  };

  const handleCreate = () => {
    if (!currentParticipant) {
      setShowLogin(true);
      return;
    }
    if (!newTitle.trim()) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    createTasting.mutate({
      title: newTitle.trim(),
      date: newDate,
      location: newLocation.trim() || "—",
      hostId: currentParticipant.id,
      code,
      status: "draft",
      currentAct: "act1",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto space-y-12 py-10">
      <LoginDialog open={showLogin} onClose={() => setShowLogin(false)} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center space-y-6"
      >
        <div className="w-16 h-1 bg-primary mx-auto mb-6 opacity-50"></div>
        <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tighter text-primary pb-2">
          {t('app.name')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto font-light leading-relaxed font-serif italic">
          "{t('app.tagline')}"
        </p>
        {currentParticipant ? (
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-semibold text-primary">{currentParticipant.name}</span>
          </p>
        ) : (
          <Button variant="outline" onClick={() => setShowLogin(true)} className="font-serif border-primary/30 text-primary" data-testid="button-login">
            Sign In to Begin
          </Button>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
          <Card className="h-full border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-serif text-2xl text-primary">
                <UserPlus className="w-5 h-5 text-accent" /> Join Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Access Code"
                className="font-mono uppercase tracking-widest bg-secondary/30 border-border/50"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                data-testid="input-join-code"
              />
              {joinError && <p className="text-xs text-destructive">{joinError}</p>}
            </CardContent>
            <CardFooter>
              <Button onClick={handleJoin} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-serif tracking-wide" data-testid="button-join-session">
                Enter Tasting Room <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}>
          <Card className="h-full border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-serif text-2xl text-primary">
                <Plus className="w-5 h-5 text-accent" /> Host Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Title</Label>
                <Input placeholder="Friday Night Drams" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-secondary/20" data-testid="input-tasting-title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Date</Label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-secondary/20" data-testid="input-tasting-date" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Location</Label>
                  <Input placeholder="The Library" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="bg-secondary/20" data-testid="input-tasting-location" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button
                variant="outline"
                onClick={handleCreate}
                disabled={createTasting.isPending || !newTitle.trim()}
                className="w-full border-primary/20 hover:border-primary text-primary hover:bg-secondary font-serif tracking-wide"
                data-testid="button-create-tasting"
              >
                {createTasting.isPending ? "Creating..." : "Create New Event"}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      {/* Existing Sessions */}
      {tastings && tastings.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="w-full space-y-4">
          <h2 className="text-xl font-serif text-primary">Recent Sessions</h2>
          <div className="space-y-2">
            {tastings.map((tasting: any) => (
              <button
                key={tasting.id}
                onClick={() => navigate(`/tasting/${tasting.id}`)}
                className="w-full text-left p-4 bg-card border border-border/50 rounded-lg hover:shadow-sm transition-all flex justify-between items-center group"
                data-testid={`card-tasting-${tasting.id}`}
              >
                <div>
                  <div className="font-serif font-bold text-primary group-hover:underline">{tasting.title}</div>
                  <div className="text-sm text-muted-foreground">{tasting.location} • {new Date(tasting.date).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground font-mono uppercase">{tasting.status}</span>
                  <span className="text-xs font-mono text-muted-foreground">Code: {tasting.code}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
