// Pure constants with no server-only imports, so both server code and
// "use client" components (the offline-first salesman pages) can import
// them safely. lib/clients.ts re-exports from here to keep existing
// imports elsewhere unchanged.

export const CLIENT_CATEGORIES = ["retailer", "horeca", "corporate"] as const;
export type ClientCategory = (typeof CLIENT_CATEGORIES)[number];

export const CLIENT_CATEGORY_LABELS: Record<ClientCategory, string> = {
  retailer: "Retailer",
  horeca: "HORECA",
  corporate: "Corporate",
};

export const CLIENT_SUBTYPES = [
  "imt",
  "lmt",
  "modern_trade",
  "large_grocery",
  "convenience_shop",
  "karyana_store",
  "restaurant",
  "catering",
  "pakwan_centre",
  "cafe",
  "marquee",
  "hospital",
  "university",
  "college",
  "industry",
  "manufacturer",
] as const;
export type ClientSubtype = (typeof CLIENT_SUBTYPES)[number];

// Which subtypes belong under each category — drives the cascading
// subtype dropdown and validates that a subtype was picked from the
// right list.
export const CLIENT_SUBTYPES_BY_CATEGORY: Record<ClientCategory, ClientSubtype[]> = {
  retailer: ["imt", "lmt", "modern_trade", "large_grocery", "convenience_shop", "karyana_store"],
  horeca: ["restaurant", "catering", "pakwan_centre", "cafe", "marquee"],
  corporate: ["hospital", "university", "college", "industry", "manufacturer"],
};

export const CLIENT_SUBTYPE_LABELS: Record<ClientSubtype, string> = {
  imt: "IMT",
  lmt: "LMT",
  modern_trade: "Modern Trade",
  large_grocery: "Large Grocery",
  convenience_shop: "Convenience Shop",
  karyana_store: "Karyana Store",
  restaurant: "Restaurant",
  catering: "Catering",
  pakwan_centre: "Pakwan Centre",
  cafe: "Cafe",
  marquee: "Marquee",
  hospital: "Hospital",
  university: "University",
  college: "College",
  industry: "Industry",
  manufacturer: "Manufacturer",
};

export function isSubtypeInCategory(category: string, subtype: string): boolean {
  return (CLIENT_SUBTYPES_BY_CATEGORY[category as ClientCategory] as string[] | undefined)?.includes(
    subtype,
  ) ?? false;
}

export const PRODUCT_UNITS = ["kg", "bag", "bottle"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];
