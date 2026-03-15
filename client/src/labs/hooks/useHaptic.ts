type HapticPattern = "light" | "medium" | "heavy" | "success" | "boundary";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 30],
  boundary: [10, 30, 10],
};

const supportsVibration = typeof navigator !== "undefined" && "vibrate" in navigator;

export function triggerHaptic(pattern: HapticPattern = "light") {
  if (!supportsVibration) return;
  try {
    navigator.vibrate(patterns[pattern]);
  } catch {}
}

export function useHaptic() {
  return {
    supported: supportsVibration,
    tap: () => triggerHaptic("light"),
    medium: () => triggerHaptic("medium"),
    heavy: () => triggerHaptic("heavy"),
    success: () => triggerHaptic("success"),
    boundary: () => triggerHaptic("boundary"),
  };
}
