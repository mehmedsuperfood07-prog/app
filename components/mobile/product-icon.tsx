import { GlassWater, Package, Wheat } from "lucide-react";

// A recognisable glyph per product so a list of similar-looking rows is
// scannable at a glance — juice bottles, grain/flour, everything else.
// Chosen from the product's unit (anything sold by weight is a dry
// staple) with the name as a fallback; no per-product setup needed. Going
// by name alone missed rice grades named only by brand, like "Biryani
// White Label", which fell through to the generic box.
export function ProductIcon({
  name,
  unit,
  className = "h-11 w-11",
}: {
  name: string;
  unit: string;
  className?: string;
}) {
  const lower = name.toLowerCase();
  const Icon =
    unit === "bottle" || lower.includes("juice")
      ? GlassWater
      : unit === "kg" ||
          unit === "bag" ||
          lower.includes("atta") ||
          lower.includes("flour") ||
          lower.includes("rice") ||
          lower.includes("wheat")
        ? Wheat
        : Package;

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground ${className}`}
    >
      <Icon size={20} strokeWidth={2} />
    </div>
  );
}
