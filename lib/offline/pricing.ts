"use client";

import type { CachedProduct, CachedPriceOverride } from "@/lib/offline/db";

// Mirrors listProductsWithPricingForClient in lib/orders.ts, for display
// only while offline — the server always recomputes this from the live
// catalog at sync time, so a stale cached value here can never become
// the price actually charged.
export function effectivePrice(
  product: CachedProduct,
  clientId: string,
  overrides: CachedPriceOverride[],
): number {
  const override = overrides.find(
    (o) => o.client_id === clientId && o.product_id === product.id,
  );
  return override?.special_price ?? product.default_price;
}
