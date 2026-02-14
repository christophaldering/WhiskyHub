import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Wine, ArrowRight, UserPlus, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-2xl mx-auto space-y-12 py-10">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-6"
      >
        <div className="inline-block p-4 rounded-full bg-primary/10 border border-primary/20 mb-4 animate-pulse">
           <Wine className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary via-orange-300 to-amber-700 pb-2">
          Dram & Data
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto font-light leading-relaxed">
          The gentleman's companion for tracking, rating, and analyzing whisky tastings in real-time.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 w-full">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.2 }}
        >
          <Card className="h-full border-primary/20 bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-colors group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-2xl text-primary">
                <UserPlus className="w-6 h-6" /> Join Tasting
              </CardTitle>
              <CardDescription>Enter a code to join an existing session.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input placeholder="Enter Code (e.g. DRAMS25)" className="font-mono uppercase" />
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/tasting/t1">
                <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  Enter Room <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-border/50 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-2xl">
                <Plus className="w-6 h-6 text-muted-foreground" /> Host Session
              </CardTitle>
              <CardDescription>Create a new tasting event for your guests.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Set up a flight, invite guests via link, and watch live analytics as they rate your selection.
              </p>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button variant="outline" className="w-full border-primary/20 hover:border-primary text-primary hover:bg-primary/10">
                Create Event
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <p className="text-sm text-muted-foreground/50 font-serif italic">
          "Too much of anything is bad, but too much good whiskey is barely enough." — Mark Twain
        </p>
      </motion.div>
    </div>
  );
}
