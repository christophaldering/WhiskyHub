import { APP_VERSION, APP_NAME } from "@shared/version";
import { useQuery } from "@tanstack/react-query";

export function BuildFooter() {
  const { data } = useQuery<{ version: string; gitSha: string; env: string }>({
    queryKey: ["/version"],
    staleTime: Infinity,
    retry: false,
  });

  const sha = data?.gitSha ?? "dev";
  const env = data?.env ?? (import.meta.env.DEV ? "dev" : "prod");

  return (
    <footer
      className="hidden md:flex fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none justify-center pb-1"
      data-testid="footer-build-info"
    >
      <span className="text-[10px] text-muted-foreground/40 font-mono tracking-wide select-none">
        {APP_NAME} &bull; Build {sha} &bull; {env}
      </span>
    </footer>
  );
}
