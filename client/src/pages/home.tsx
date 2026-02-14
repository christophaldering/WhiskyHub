import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { BookOpen, ArrowRight, UserPlus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/lib/store";

export default function Home() {
  const { t } = useTranslation();
  const { currentUser } = useSessionStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto space-y-16 py-10">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center space-y-8"
      >
        <div className="w-16 h-1 bg-primary mx-auto mb-8 opacity-50"></div>
        <h1 className="text-5xl md:text-7xl font-serif font-black tracking-tighter text-primary pb-2">
          {t('app.name')}
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto font-light leading-relaxed font-serif italic">
          "{t('app.tagline')}"
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 w-full">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2, duration: 0.8 }}
        >
          <Card className="h-full border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-serif text-2xl text-primary">
                <UserPlus className="w-5 h-5 text-accent" /> Join Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Access Code (e.g. CASK26)" className="font-mono uppercase tracking-widest bg-secondary/30 border-border/50" />
            </CardContent>
            <CardFooter>
              <Link href="/tasting/t1">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-serif tracking-wide">
                  Enter Tasting Room
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4, duration: 0.8 }}
        >
          <Card className="h-full border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-serif text-2xl text-primary">
                <Plus className="w-5 h-5 text-accent" /> Host Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Curate a flight, guide the ritual, and reveal collective insights.
              </p>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button variant="outline" className="w-full border-primary/20 hover:border-primary text-primary hover:bg-secondary font-serif tracking-wide">
                Create New Event
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
