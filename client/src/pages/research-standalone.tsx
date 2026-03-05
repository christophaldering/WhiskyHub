import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import Research from "@/pages/research";

export default function ResearchStandalone() {
  return (
    <SimpleShell maxWidth={700}>
      <BackButton fallback="/discover/rabbit-hole" />
      <Research />
    </SimpleShell>
  );
}
