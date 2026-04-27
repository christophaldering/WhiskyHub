import { useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InfoHintProps = {
  text: string;
  testId?: string;
  ariaLabel?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

export function InfoHint({
  text,
  testId,
  ariaLabel,
  side = "bottom",
  align = "center",
}: InfoHintProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen((value) => !value);
            }}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") {
                setOpen(true);
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") {
                setOpen(false);
              }
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            aria-label={ariaLabel ?? text}
            data-testid={testId ?? "info-hint"}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              margin: 0,
              marginLeft: 4,
              cursor: "help",
              color: "rgba(168,154,133,0.55)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              minHeight: 32,
              borderRadius: 4,
              flex: "0 0 auto",
              lineHeight: 1,
            }}
          >
            <Info size={13} aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={6}
          className="z-[1100]"
          style={{
            maxWidth: 280,
            background: "#15110C",
            color: "#F5EDE0",
            border: "1px solid rgba(201,169,97,0.35)",
            fontSize: 12,
            lineHeight: 1.5,
            padding: "8px 12px",
            fontFamily: "'Inter', system-ui, sans-serif",
            boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
          }}
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
