import Image from "next/image";
import logo from "@/public/brand/logo.png";

// The Mehmed logo (built from brand/logo.png by scripts/generate-brand-assets.mjs).
// Size it with a height class; the width follows the artwork's proportions. It is
// served as-is (unoptimized): it is a small transparent PNG, and this keeps the
// exact pixels and leaves nothing to fetch from an image service when offline.
export function BrandLogo({
  className = "h-9",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return <Image src={logo} alt="Mehmed" priority={priority} unoptimized className={`w-auto ${className}`} />;
}
