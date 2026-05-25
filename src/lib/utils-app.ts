export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

export const today = () => new Date().toISOString().slice(0, 10);

export const rp = (n: number | null | undefined) =>
  "Rp " + Number(n || 0).toLocaleString("id-ID");

export const formatTanggal = (d?: string | null) => {
  if (!d) return "-";
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

export const formatTanggalShort = (d?: string | null) => {
  if (!d) return "-";
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return d;
  }
};

export function sanitize(str: unknown): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 500);
}

export function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}
