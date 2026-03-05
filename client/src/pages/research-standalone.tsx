import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import HeroWhiskyBg from "@/components/hero-whisky-bg";
import Research from "@/pages/research";

export default function ResearchStandalone() {
  return (
    <SimpleShell maxWidth={700}>
      <HeroWhiskyBg />
      <div style={{ position: "relative", zIndex: 1 }}>
        <BackButton fallback="/discover/rabbit-hole" />
        <Research />
      </div>
    </SimpleShell>
  );
}
