import { useState, useEffect } from "react";

let listenerCount = 0;
let focused = false;
const listeners = new Set<(val: boolean) => void>();

function notifyAll() {
  listeners.forEach((fn) => fn(focused));
}

function handleFocusIn(e: FocusEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    focused = true;
    notifyAll();
  }
}

function handleFocusOut() {
  focused = false;
  notifyAll();
}

export function useInputFocused(): boolean {
  const [isFocused, setIsFocused] = useState(() => focused);

  useEffect(() => {
    setIsFocused(focused);
    listeners.add(setIsFocused);
    listenerCount++;

    if (listenerCount === 1) {
      document.addEventListener("focusin", handleFocusIn);
      document.addEventListener("focusout", handleFocusOut);
    }

    return () => {
      listeners.delete(setIsFocused);
      listenerCount--;
      if (listenerCount === 0) {
        document.removeEventListener("focusin", handleFocusIn);
        document.removeEventListener("focusout", handleFocusOut);
      }
    };
  }, []);

  return isFocused;
}
