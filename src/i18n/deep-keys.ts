export function deepKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object') {
      out.push(...deepKeys(v, path));
    } else {
      out.push(path);
    }
  }
  return out;
}
