const PREFIX = "dapur_cache_";

export function saveToCache<T>(table: string, data: T): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(PREFIX + table, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadFromCache<T>(table: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(PREFIX + table);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearAllCache(): void {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}
