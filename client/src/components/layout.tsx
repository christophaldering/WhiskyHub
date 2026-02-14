import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { GlassWater, BarChart3, Home, Users, Wine, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
// @ts-ignore
import bgImage from "@/assets/whisky-bg.png";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/", icon: Home, label: "Lobby" },
    { href: "/tasting/t1", icon: GlassWater, label: "Tasting Room" },
    { href: "/results/t1", icon: BarChart3, label: "Live Stats" },
    { href: "/admin", icon: Users, label: "Host Admin" },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card/95 backdrop-blur-md border-r border-border/50">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-full border border-primary/30">
            <Wine className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight text-primary">
            Dram & Data
          </h1>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-300 cursor-pointer group",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-3px_rgba(255,190,0,0.1)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
                onClick={() => setOpen(false)}
              >
                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                <span className={cn("font-medium", isActive && "font-semibold")}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-left text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Leave Tasting</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      {/* Background with overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none opacity-20"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-background via-background/95 to-background/80 pointer-events-none" />

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <Wine className="w-5 h-5 text-primary" />
          <span className="font-serif font-bold text-lg">Dram & Data</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 hover:text-primary">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-r-border/50 w-72 bg-card">
            <NavContent />
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex relative z-10 h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-72 h-full">
          <NavContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="container max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-8 animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
