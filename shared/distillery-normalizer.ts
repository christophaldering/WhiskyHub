export function canonicalizeDistilleryName(name: string | null | undefined): string {
  if (!name) return "";
  let s = String(name).normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.toLowerCase();
  s = s.replace(/&/g, " and ");
  s = s.replace(/^\s*(the|a|an)\s+/i, "");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  s = s.replace(/\s+/g, " ");
  return s;
}

export function distilleryNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = canonicalizeDistilleryName(a);
  const cb = canonicalizeDistilleryName(b);
  return ca.length > 0 && ca === cb;
}
