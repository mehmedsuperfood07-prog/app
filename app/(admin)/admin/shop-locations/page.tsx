import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/form-field";
import { Card } from "@/components/mobile/card";
import { PageHeader } from "@/components/mobile/page-header";
import { StatusPill } from "@/components/mobile/status-pill";
import { SubmitButton } from "@/components/mobile/submit-button";
import { reviewShopLocationAction, setShopLocationAction } from "@/lib/actions/shop-locations";
import { listShopLocations, type ShopRow } from "@/lib/shop-locations";

const mapLink = (l: { latitude: number; longitude: number }) => `https://www.google.com/maps?q=${l.latitude},${l.longitude}`;

// Staff check in at shops, so a shop's location has to be right. A salesman saves it while
// standing there and the office looks at the map before it counts.
export default async function ShopLocationsPage() {
  const shops = await listShopLocations();
  const waiting = shops.filter((s) => s.location?.status === "pending");

  return (
    <div>
      <PageHeader title="Shop locations" subtitle="Field staff can mark attendance only at a shop confirmed here" />

      {waiting.length > 0 && (
        <div className="mb-5 space-y-2.5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Waiting for you ({waiting.length})</h2>
          {waiting.map((s) => (
            <Card key={s.id} className="space-y-2.5">
              <Heading shop={s} />
              <p className="text-xs text-zinc-500">
                Saved by the salesman, exact to about {s.location!.accuracy_m ?? "?"} metres. Check that the pin is at the shop.{" "}
                <a href={mapLink(s.location!)} target="_blank" rel="noreferrer" className="font-medium text-accent underline">
                  Open the map
                </a>
              </p>
              <div className="flex gap-2">
                <ActionForm action={reviewShopLocationAction}>
                  <input type="hidden" name="client_id" value={s.id} />
                  <input type="hidden" name="confirm" value="true" />
                  <SubmitButton variant="compact" pendingLabel="Saving…">
                    Confirm
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={reviewShopLocationAction} confirmMessage={`Remove the saved location for ${s.name}?`}>
                  <input type="hidden" name="client_id" value={s.id} />
                  <input type="hidden" name="confirm" value="false" />
                  <SubmitButton variant="compactOutline" pendingLabel="Removing…">
                    Remove
                  </SubmitButton>
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">All shops</h2>
      <div className="grid items-start gap-2.5 lg:grid-cols-2">
        {shops.map((s) => (
          <Card key={s.id} className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <Heading shop={s} />
              {s.location?.status === "confirmed" ? (
                <StatusPill tone="strong">Confirmed</StatusPill>
              ) : s.location ? (
                <StatusPill tone="soft">Waiting</StatusPill>
              ) : (
                <StatusPill tone="neutral">No location</StatusPill>
              )}
            </div>
            {s.location && (
              <a href={mapLink(s.location)} target="_blank" rel="noreferrer" className="block text-xs font-medium text-accent underline">
                Open the map
              </a>
            )}
            <ActionForm action={setShopLocationAction} resetOnSuccess className="flex items-end gap-2">
              <input type="hidden" name="client_id" value={s.id} />
              <div className="flex-1">
                <Field label="Set it from the map" name="coordinates" placeholder="31.5204, 74.3587" required />
              </div>
              <SubmitButton variant="compactOutline" pendingLabel="Saving…">
                Save
              </SubmitButton>
            </ActionForm>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Heading({ shop: s }: { shop: ShopRow }) {
  return (
    <div className="min-w-0 text-sm">
      <div className="font-semibold text-zinc-900 dark:text-zinc-50">{s.name}</div>
      <div className="text-zinc-500 dark:text-zinc-400">{[s.area, s.address, s.salesman].filter(Boolean).join(" · ")}</div>
    </div>
  );
}
