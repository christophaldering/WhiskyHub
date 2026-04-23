import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalPortalProps = {
  open: boolean;
  onClose: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  overlayStyle?: React.CSSProperties;
  testId?: string;
  initialFocusRef?: React.RefObject<HTMLElement>;
  children: ReactNode;
};

export default function ModalPortal({
  open,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  overlayStyle,
  testId,
  initialFocusRef,
  children,
}: ModalPortalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const target = initialFocusRef?.current;
      if (target && typeof target.focus === "function") target.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, initialFocusRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={
        "fixed inset-0 z-50 flex items-center justify-center p-4 " + (className || "")
      }
      style={{
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        ...overlayStyle,
      }}
      onClick={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      data-testid={testId}
    >
      {children}
    </div>,
    document.body,
  );
}
