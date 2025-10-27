export const dedupeKeys = (keys: string[] = []) => [
  ...new Set(keys.filter(Boolean)),
];

export const firstError = (tuples: Array<[Error | null, unknown]>) =>
  tuples.find(([e]) => e)?.[0] as Error | undefined;

export const toResults = <T>(tuples: Array<[Error | null, unknown]>) =>
  tuples.map(([, v]) => v) as T[];

export const backoffDelayMs = (attempt: number, base = 50, cap = 2000) => {
  const expo = Math.min(cap, base * (1 << attempt));
  return Math.floor(Math.random() * expo);
};

export const isTransient = (err: unknown) => {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    m.includes('econn') ||
    m.includes('timeout') ||
    m.includes('socket') ||
    m.includes('connection') ||
    m.includes('try again') ||
    m.includes('busy')
  );
};
