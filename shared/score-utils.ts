export function clampNormalized(value: number | null | undefined): number {
  if (value == null || isNaN(value as number)) return 0;
  const n = Number(value);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export function clampNormalizedNullable(value: number | null | undefined): number | null {
  if (value == null || isNaN(value as number)) return null;
  return clampNormalized(value);
}
