const TONES = {
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
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
  pending_sync: "amber",
  placed: "blue",
  out_for_delivery: "amber",
  delivered: "green",
  cancelled: "red",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
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
  picked_up: "amber",
  on_the_way: "blue",
  delivered: "green",
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
