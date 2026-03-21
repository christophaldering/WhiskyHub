import { useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { markBackNavigation } from "@/lib/navStack";

interface BackLinkProps {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
  "data-testid"?: string;
}

export default function BackLink({ href, className, style, children, "data-testid": testId }: BackLinkProps) {
  const [, navigate] = useLocation();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      markBackNavigation();
      navigate(href);
    },
    [href, navigate],
  );

  return (
    <a href={href} onClick={handleClick} className={className} style={style} data-testid={testId}>
      {children}
    </a>
  );
}
