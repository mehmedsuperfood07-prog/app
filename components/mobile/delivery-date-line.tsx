import { CalendarDays } from "lucide-react";
import { describeDeliveryDate, isDeliveryOverdue } from "@/lib/format";

// "Deliver Tomorrow · Sun 18 Oct". Orders placed before delivery dates existed
// have none, so this renders nothing for them. An order past its date and not
// yet delivered says "Overdue" instead, in heavier type (the palette is
// greens and neutrals only, so weight carries the emphasis, not a warning colour).
export function DeliveryDateLine({
  date,
  status = "placed",
  size = "xs",
  className = "",
}: {
  date: string | null | undefined;
  status?: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  if (!date) return null;
  const overdue = isDeliveryOverdue(date, status);

  return (
    <p
      className={`flex items-center gap-1 ${size === "sm" ? "text-sm" : "text-xs"} ${
        overdue
          ? "font-semibold text-zinc-900 dark:text-zinc-50"
          : "text-zinc-500 dark:text-zinc-400"
      } ${className}`}
    >
      <CalendarDays size={size === "sm" ? 14 : 12} className="shrink-0" />
      {overdue ? "Overdue · " : "Deliver "}
      {describeDeliveryDate(date)}
    </p>
  );
}
