// Pure constants with no server-only imports, so both server code and
// "use client" components (the offline-first salesman pages) can import
// them safely. lib/clients.ts and lib/products.ts re-export from here to
// keep existing imports elsewhere unchanged.

export const CUSTOMER_TYPES = [
  "general_store",
  "departmental_store",
  "bakery",
  "factory_canteen",
  "distributor",
] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  general_store: "General Store",
  departmental_store: "Departmental Store",
  bakery: "Bakery",
  factory_canteen: "Factory / Staff Canteen",
  distributor: "Distributor",
};

export const PRODUCT_UNITS = ["kg", "bag", "bottle"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];
