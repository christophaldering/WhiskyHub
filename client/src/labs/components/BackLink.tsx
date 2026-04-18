import { useCallback, type ReactNode } from "react";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";

interface BackLinkProps {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
  "data-testid"?: string;
}

export default function BackLink({ href, className, style, children, "data-testid": testId }: BackLinkProps) {
  const goBack = useBackNavigation(href);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      goBack();
    },
    [goBack],
  );

  return (
    <a href={href} onClick={handleClick} className={className} style={style} data-testid={testId}>
      {children}
    </a>
  );
}
