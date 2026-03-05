import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import BenchmarkAnalyzer from "@/pages/benchmark-analyzer";

export default function MyTasteBenchmark() {
  return (
    <SimpleShell maxWidth={900}>
      <BackButton />
      <BenchmarkAnalyzer />
    </SimpleShell>
  );
}
