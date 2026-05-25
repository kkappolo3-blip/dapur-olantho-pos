// Pricing logic — v3.10
// Round UP ke kelipatan 1.000
export function roundPrice(n: number): number {
  return Math.ceil(Number(n || 0) / 1000) * 1000;
}

// Markup berjenjang
export function markupByHarga(h: number): number {
  h = Number(h || 0);
  if (h <= 10000) return 2000;
  if (h <= 50000) return 5000;
  if (h <= 150000) return 10000;
  return 15000;
}

export function defaultHargaJual(hargaAsli: number, avgOngkir: number): number {
  return roundPrice(
    Number(hargaAsli || 0) + Number(avgOngkir || 0) + markupByHarga(hargaAsli),
  );
}

export function hargaBeli(hargaAsli: number, avgOngkir: number): number {
  return Math.round(Number(hargaAsli || 0) + Number(avgOngkir || 0));
}
