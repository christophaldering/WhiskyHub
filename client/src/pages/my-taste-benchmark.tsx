import SimpleShell from "@/components/simple/simple-shell";
import BenchmarkAnalyzer from "@/pages/benchmark-analyzer";

export default function MyTasteBenchmark() {
  return (
    <SimpleShell maxWidth={900}>
      <BenchmarkAnalyzer />
    </SimpleShell>
  );
}
