// A percentage discount on an order line (client, 2026-11-08). The order keeps only the final
// rate, as it always has; the percentage is how that rate is worked out on the form. Whole paisa
// and hundredths of a percent, so no rounding creeps in from decimals.

export function clampDiscount(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, Math.round(pct * 100) / 100));
}

// The rate after the discount, to the paisa.
export function netRate(rate: number, pct: number): number {
  const paisa = Math.round(rate * 100);
  const keep = 10000 - Math.round(clampDiscount(pct) * 100);
  return Math.round((paisa * keep) / 10000) / 100;
}

// Opening a saved order: reads a rate below the list price as that percentage off it, if the
// percentage gives back exactly that rate. Otherwise it stays a rate someone typed.
export function splitRate(listPrice: number, unitPrice: number): { rate: number; pct: number } {
  if (listPrice > 0 && unitPrice > 0 && unitPrice < listPrice) {
    const pct = clampDiscount(((listPrice - unitPrice) / listPrice) * 100);
    if (netRate(listPrice, pct) === unitPrice) return { rate: listPrice, pct };
  }
  return { rate: unitPrice, pct: 0 };
}
