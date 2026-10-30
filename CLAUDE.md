# Mehmed Order Manager — Project Brief for Claude Code

> Place this file as `CLAUDE.md` in the project root. Claude Code reads it automatically at the start of every session in this repo — treat it as the single source of truth for scope, data model, and conventions. Update it as decisions change; don't let it go stale.

---

## 1. Business context

**Client:** Mehmed Super Foods — a bulk supplier/distributor in Lahore, Pakistan.

**Products sold today:**

| Product | Variant | Pack size |
|---|---|---|
| Mehmed Chakki Atta | Whole wheat flour, stone-ground | 5 kg |
| Mehmed Rice | Standard | *(confirm pack size with client)* |
| Rizqan Sugarcane Juice | Lemon | 1 L bottle |
| Rizqan Sugarcane Juice | Lemon + Mint | 1 L bottle |

More products will be added over time — the catalog must be admin-editable, not hardcoded.

**Customer types:** general stores, departmental stores, bakeries, factories/staff canteens, and other distributors. Every client account should be tagged with one of these types — it's how the business already thinks about its customers, and it's useful for reporting later.

**Service area:** Lahore, specifically these areas — **Gulberg, Model Town, Johar Town, DHA, Township, Shahdera, Allama Iqbal Town, Faisal Town**. Seed these as the initial area/beat list (see data model). New areas can be added by the admin.

**Business model:** B2B bulk delivery — salesmen visit stores and take orders in person; the business emphasizes reliable, on-time delivery and hygienic packing as its differentiators. This app digitizes that relationship without changing it — no paperwork, same relationships.

---

## 2. Team & roles

Built for a **medium-sized team**: roughly 4–10 salesmen and several delivery riders, plus office/admin staff. Because of this scale, area/beat grouping is part of the MVP, not a later add-on — a salesman's client list should be filterable by their assigned area(s) from day one.

| Role | Does | Does NOT do |
|---|---|---|
| **Salesman** | Takes orders from their assigned clients (in-person, on their phone), can add a new client, views their own order history, can edit their own order (products, quantities, rates, date) until a rider is assigned | Cannot edit prices, cannot see other salesmen's clients or orders, cannot see the client ledger's full history — only outstanding balance at order time |
| **Rider (delivery)** | Sees orders assigned to them, updates status (Picked Up → On the Way → Delivered), captures proof of delivery | Cannot create or edit orders, cannot see pricing or ledger details |
| **Admin/Office** | Manages product catalog & prices, manages client accounts & credit terms, manages price overrides, assigns salesmen/riders to areas, sees everything — all orders, invoices, ledgers, reports. Can also do the salesman's and rider's jobs from the admin screens: take an order for any client (credited to a salesman, normally the client's own), edit any order until it is delivered, and move a delivery forward or mark it delivered on the rider's behalf — including delivering an order with no rider (client collected it) | — |

No public sign-up screen. Admin creates every staff account (see Auth, below).

---

## 3. Recommended stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router), installable as a PWA | Deployed on Vercel |
| Local/offline data | Dexie.js (IndexedDB) + a sync queue | Orders write locally first, always — sync is a background process, never something the salesman waits on |
| Backend | Supabase — Postgres, Auth, Storage, Realtime | Row-level security enforces the role table above at the database level, not just in the UI |
| Auth | Supabase Auth, **email + password**, accounts created by admin only | No SMS/OTP — keeps this fully free (phone OTP needs a paid SMS provider) |
| Invoices | Server/edge function renders the invoice PDF when the admin assigns a rider, stored in Supabase Storage | |
| Hosting | Vercel (Hobby to start) | See the cost note below |

**Cost note:** Vercel's free Hobby plan and Supabase's free plan cover this comfortably at this scale (well under the free request/storage caps). One thing to know: Vercel's Hobby plan terms are written for "personal, non-commercial use" — a client's business app doesn't strictly fit that wording, though small internal tools run on it constantly without issue in practice. If full compliance matters, budget $20/month for Vercel Pro once the app is live for the business, or host on Netlify's free tier instead, which carries no such restriction.

**GitHub:** this project lives under a **new GitHub account created specifically for this client** — keep it fully separate from your personal repos, since you may hand the project fully to Mehmed Super Foods later.

---

## 4. Data model

Have Claude Code generate this as an actual Supabase migration early — get it right before building UI on top of it.

```
profiles
  id (= auth.users.id), full_name, phone, role (admin | salesman | rider), active

areas
  id, name        -- seed: Gulberg, Model Town, Johar Town, DHA, Township,
                   --       Shahdera, Allama Iqbal Town, Faisal Town

salesman_areas
  salesman_id, area_id      -- a salesman can cover more than one area

clients
  id, name, customer_type (general_store | departmental_store | bakery |
      factory_canteen | distributor), address, area_id, phone,
      credit_limit, current_balance, assigned_salesman_id, active

products
  id, name, variant, unit (kg | bag | bottle), pack_size, default_price,
  category, active

price_overrides
  client_id, product_id, special_price      -- negotiated rate; falls back
                                             -- to products.default_price
                                             -- when no row exists

orders
  id, client_id, salesman_id, status
      (draft | pending_sync | placed | out_for_delivery | delivered | cancelled),
  created_offline_at, synced_at, rider_id,
  expected_delivery_date      -- date; required on the salesman's order form,
                              -- null only on orders placed before it existed
  cancelled_at, cancelled_by, cancel_reason   -- set by cancel_order()
  placed_by     -- who entered it when that wasn't the salesman (an admin,
                -- via admin_create_order); null = the salesman did

order_items
  order_id, product_id, quantity, unit_price_at_order_time
      -- always snapshot the price actually charged — never
      -- recompute historical orders off today's price list

order_status_history
  order_id, status, changed_by, changed_at      -- full audit trail

deliveries
  order_id, rider_id, status, proof_of_delivery_photo_url, delivered_at

invoices
  order_id, invoice_number, pdf_url, amount, paid_amount, due_date,
  voided_at, voided_by, void_reason
      -- never deleted; a cancelled order's invoice is marked void and keeps
      -- its number. At most one live (voided_at is null) invoice per order,
      -- enforced by a unique index; a cancelled order can't be invoiced.

payments
  client_id, invoice_id, amount, method, recorded_by, recorded_at

integration_events
  entity_type, entity_id, event_type, payload, created_at
      -- generic log of state changes — this is the seam a future CRM
      -- or reporting tool reads from; costs nothing to add now,
      -- expensive to retrofit later
```

**Integration events written today** (the contract the ERP reads; add to it, never change an existing event's meaning). Written inside the same transaction as the change itself, by the database functions below:

| event_type | entity | payload |
|---|---|---|
| `order.rider_changed` | order | `from_rider_id`, `to_rider_id`, `delivery_status_before`, `changed_by` |
| `order.cancelled` | order | `previous_status`, `client_id`, `rider_id`, `reason`, `cancelled_by`, `voided_invoices` [{`invoice_id`, `invoice_number`, `amount`}], `balance_reversed` |
| `invoice.voided` | invoice | `order_id`, `client_id`, `invoice_number`, `amount`, `reason`, `voided_by` |
| `order.created_by_admin` | order | `client_id`, `salesman_id`, `placed_by`, `expected_delivery_date`, `total` |
| `order.edited` | order | `client_id`, `order_status`, `edited_by`, `before_items`/`after_items` [{`product_id`, `quantity`, `unit_price`}], `before_total`, `after_total`, `before_delivery_date`, `after_delivery_date`, `voided_invoice` ({`invoice_id`, `invoice_number`, `amount`} or null) |
| `order.delivery_updated_by_admin` | order | `from_status` (null = delivered with no rider), `to_status`, `order_status_before`, `rider_id`, `changed_by` |

| `order.delivered_in_erp` | order | `order_status_before`, `rider_id` — the office confirmed the delivery in the ERP (`mark_delivered_from_erp`) |

`*_by` is null when the service role (e.g. an ERP backend job) made the change. Orders placed from the salesman app, rider assignment, the rider's own delivery steps and invoice creation don't write events yet.

**The ERP link** (migration `20261030000000_erp_link.sql`; the ERP repo's CLAUDE.md section 6 and its migration `20261030000200_order_app_link.sql`). Off until the ERP's go-live switch (`erp.company_settings.order_app_linked`, read here with `public.erp_linked()`). While off, nothing below happens. Once on:
- **Assigning a rider** makes the ERP delivery challan, from the ERP's default store and with the ERP's credit control. A customer over their limit or with late invoices can't be assigned until the Sales Manager or CEO approves the challan in the ERP. A product not set up in the ERP also stops it. The app no longer makes its own invoice or changes `current_balance`.
- **The order becoming delivered** (the rider's last step, or `admin_update_delivery`) posts the ERP invoice. A refusal never stops the delivery: it goes to the ERP's "Offline problems" list.
- **The ERP confirming a delivery** marks the order delivered here (`mark_delivered_from_erp`).
- **Cancelling an order** cancels its challan. **Changing one that is out for delivery** remakes it.
- **`clients.current_balance` is kept by the ERP** as the customer's ledger balance (owed less advances). `erp.order_app_credit()` adds the late amount, for the credit warning.
- Orders the app invoiced itself before the link keep that invoice, which goes into the ERP's opening balances.
- `profiles.role` gains **`office`**: staff who only use the ERP. They have no order-app screens and don't appear as salesmen.

**Business rules as database functions.** The ERP will share this database, so rules both apps must obey live in Postgres functions both can call (admin or service role only, one transaction each): `change_order_rider(order, rider)`, `cancel_order(order, reason)`, `admin_create_order(client, salesman, items, delivery_date)`, `edit_order(order, items, delivery_date)` (also callable by the order's salesman while it is placed) and `admin_update_delivery(order, status)` (refuses "delivered" unless the order has a live invoice; the app raises it first). App code in `lib/` calls them and adds only notifications. New cross-app rules should follow the same pattern.

**Row-level security, in plain terms:**
- A salesman can `select`/`insert` orders only where `client_id` is one of their own clients, and only `select` their own rows elsewhere.
- A rider can `select`/`update` only `deliveries`/`orders` where `rider_id = auth.uid()`.
- Admin (role = `admin`) bypasses all of the above.

---

## 5. Core workflows

**Taking an order (salesman, offline-capable):** pick client → catalog shows each product's price (override if one exists for that client, else default) → add quantities → choose the expected delivery date (required; shown to admin and the rider) → submit. Writes to the local queue immediately; syncs when a connection is available. The salesman never waits on a network call to add a line item.

**New client (salesman or admin):** name, customer type, area, address, phone, credit limit. Salesman-created clients are immediately usable — no approval gate blocks a sale, but they're visible to admin for review.

**Delivery (rider):** sees orders assigned to them (or filtered to their area), updates status through Picked Up → On the Way → Delivered, optionally photographs proof of delivery. The invoice already exists by then — it is raised when the admin assigns the rider, not when the order is delivered.

**Invoicing:** generated automatically when the admin assigns a rider (the order goes `placed` → `out_for_delivery`), not on delivery, so the office has it to send out with the goods. If it cannot be generated the assignment is undone and the admin retries. Uses `order_items` (the snapshotted prices, not current catalog prices). Client's `current_balance` increases by the invoice amount.

**Changing the rider (admin):** an order that is out for delivery but not delivered can move to another rider. The delivery restarts at "assigned" for the new rider; the invoice and balance don't change. Both riders are notified.

**Cancelling an order (admin):** possible while the order is placed or out for delivery, never once delivered, and not when money has been recorded against its invoice (that needs a refund/credit note, out of scope). A reason is required. The order becomes `cancelled`, its invoice is marked void (kept, number not reused), and the client's balance goes back down by the invoice amount. The rider and salesman are notified. Corrections after delivery (returns, credit notes) are Phase 3.

**Editing an order:** the salesman can change his own order (products, quantities, rates, delivery date) until a rider is assigned; the admin can change any order until it is delivered. Not the client (cancel and re-place instead). If the products, quantities or rates of an invoiced order change, the old invoice is marked void and its amount comes off the balance, and a new invoice (new number) is raised for the new total; changing only the date keeps the invoice. An invoice with a payment recorded against it blocks the edit. "Nothing was changed" is refused. Every edit logs `order.edited` with the lines before and after and shows in the order timeline; the rider (if any), the salesman or the office is notified.

**Payment recording (admin/office):** logs a payment against a client or a specific invoice; `current_balance` decreases. This is the client ledger — no separate accounting system needed for Phase 1.

**Price overrides (admin):** set a special price for a specific client + product. Order creation always checks this table first.

---

## 6. Screens, by role

**Salesman:** login · client list (filtered to assigned area/clients, searchable) · new client form · new order (catalog + quantities) · my order history · sync status indicator.

**Rider:** login · my assigned deliveries (today) · order detail (items, client address) · status update buttons · proof-of-delivery capture.

**Admin:** login · dashboard (orders today, outstanding balances, quick stats) · client list & detail (incl. ledger) · product catalog management · price override management · salesman/rider account management & area assignment · order list (all, filterable) · invoice list.

---

## 7. Build roadmap

**Phase 1 — MVP (a working, usable app)**
1. Supabase schema + RLS policies (section 4)
2. Auth: admin creates accounts, role-based redirect after login
3. Admin: client CRUD, product CRUD, area management
4. Salesman: client list (by assigned area), new order — **online-only first**
5. Rider: assigned orders, status updates
6. Basic PDF invoice (raised when a rider is assigned)
7. Layer in Dexie.js + sync queue on top of the now-working online flow

**Phase 2 — running the business day to day**
- Price overrides UI
- Client ledger + payment recording, credit-limit warning at order time
- Admin dashboard: sales by salesman/area/product, outstanding balances
- Sync robustness: conflict handling, retry logic, visible sync status
- WhatsApp order/delivery confirmations (Meta Cloud API)

**Phase 3 — expand**
- Inventory/stock levels
- Webhook layer reading `integration_events` — the CRM connection point
- Returns/credit notes as their own workflow
- Multi-warehouse, if the business grows there

---

## 8. Working conventions for this repo

- TypeScript throughout. App Router (`app/`), grouped by role where it makes sense (`app/(salesman)/`, `app/(rider)/`, `app/(admin)/`).
- Business logic (pricing lookups, credit-limit checks, status transitions) lives in a shared `lib/` layer, never inline in components — this is what a future CRM or second frontend will eventually call too.
- Work one roadmap bullet at a time per Claude Code session — review each before starting the next, rather than requesting a whole phase in one prompt.
- Test the offline path on an actual Android phone (Chrome), in airplane mode, by the end of Phase 1 step 7 — dev-tools offline simulation doesn't always match real PWA behavior.
- Every order total, once placed, is derived from `order_items.unit_price_at_order_time` — never from a live join to `products` or `price_overrides`. Historical orders must never change value because someone updated a price later.

---

## 9. Open questions / assumptions to confirm with the client

- **Rice pack size** — not listed on the current site; confirm actual size(s) sold.
- **Tax/legal invoice requirements** — currently assuming an informal trade invoice (no GST/FBR compliance fields). Confirm whether Mehmed needs formal tax invoices.
- **Credit limit enforcement** — should an order be blocked at the credit limit, or just flagged as a warning for admin to review? Currently assumed: warn, don't block.
- **Returns** — not in Phase 1 scope; confirm if this is a frequent enough occurrence to prioritize sooner.
