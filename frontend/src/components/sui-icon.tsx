import { cn } from "@/lib/utils"

export function SuiIcon({ className }: { className?: string }) {
  return (
    <img
      src="https://cryptologos.cc/logos/sui-sui-logo.png"
      className={cn(
        "aspect-square size-4 rounded-full bg-white object-contain p-0.5",
        className
      )}
    />
  )
}
