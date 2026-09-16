"use client";

import Dexie, { type EntityTable } from "dexie";
import type { CustomerType } from "@/lib/constants";

// Local-first cache for the salesman's client list, catalog, and order
// history, plus the outbox of orders taken while offline. Dataset sizes
// here are small (a handful of salesmen, tens of clients each, a short
// product catalog) so we deliberately skip fussing over IndexedDB
// secondary indexes — plain arrays filtered in JS are simpler and fast
// enough at this scale.

export type CachedClient = {
  id: string;
  name: string;
  customer_type: CustomerType;
  address: string | null;
  phone: string | null;
  credit_limit: number;
  current_balance: number;
  active: boolean;
  area_id: string | null;
  area_name: string | null;
};

export type CachedProduct = {
  id: string;
  name: string;
  variant: string | null;
  unit: string;
  pack_size: string;
  default_price: number;
  active: boolean;
};

export type CachedPriceOverride = {
  id: string; // `${client_id}:${product_id}`
  client_id: string;
  product_id: string;
  special_price: number;
};

// A synced order, cached for offline viewing of history. Denormalized
// (client name inlined) so rendering the list never needs a second query.
export type CachedOrder = {
  id: string;
  status: string;
  created_at: string;
  client_id: string;
  client_name: string;
  total: number;
};

export type PendingOrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

// An order taken offline (or while online — the flow is identical),
// queued locally until it can be pushed to the server. unit_price here
// is for display only; the server always recomputes the real price at
// sync time (see lib/orders.ts).
export type PendingOrder = {
  id: string;
  client_id: string;
  client_name: string;
  items: PendingOrderItem[];
  created_offline_at: string;
  status: "queued" | "syncing" | "failed";
  error?: string;
};

type SalesmanDb = Dexie & {
  clients: EntityTable<CachedClient, "id">;
  products: EntityTable<CachedProduct, "id">;
  priceOverrides: EntityTable<CachedPriceOverride, "id">;
  orders: EntityTable<CachedOrder, "id">;
  pendingOrders: EntityTable<PendingOrder, "id">;
};

export const db = new Dexie("mehmed-salesman") as SalesmanDb;

db.version(1).stores({
  clients: "id",
  products: "id",
  priceOverrides: "id",
  orders: "id",
  pendingOrders: "id",
});
