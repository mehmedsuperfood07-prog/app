// Every tone here is either neutral gray or a shade of the brand's one
// green (see app/globals.css) — no other hue anywhere in the app.
// "soft"/"medium"/"strong" reads as a progression (further along a
// workflow = more saturated green), which doubles as the status
// semantics we'd otherwise have used separate colors for.
const TONES = {
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  soft: "bg-accent-soft text-accent-soft-foreground",
  medium: "bg-accent/10 text-accent dark:bg-accent/15",
  strong: "bg-accent text-accent-foreground",
} as const;

export type PillTone = keyof typeof TONES;

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: PillTone;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const ORDER_STATUS_TONE: Record<string, PillTone> = {
  draft: "neutral",
  pending_sync: "neutral",
  placed: "soft",
  out_for_delivery: "medium",
  delivered: "strong",
  cancelled: "neutral",
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_sync: "Pending sync",
  placed: "Placed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrderStatusPill({ status }: { status: string }) {
  return (
    <StatusPill tone={ORDER_STATUS_TONE[status] ?? "neutral"}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </StatusPill>
  );
}

const DELIVERY_STATUS_TONE: Record<string, PillTone> = {
  assigned: "neutral",
  picked_up: "soft",
  on_the_way: "medium",
  delivered: "strong",
};

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  picked_up: "Picked Up",
  on_the_way: "On the Way",
  delivered: "Delivered",
};

export function DeliveryStatusPill({ status }: { status: string }) {
  return (
    <StatusPill tone={DELIVERY_STATUS_TONE[status] ?? "neutral"}>
      {DELIVERY_STATUS_LABEL[status] ?? status}
    </StatusPill>
  );
}
