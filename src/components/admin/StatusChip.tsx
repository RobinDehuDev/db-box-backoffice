import { cn } from "@/lib/utils"

export function StatusChip({
  ready,
  wipLabel,
  readyLabel,
  onToggle,
}: {
  ready: boolean
  wipLabel: string
  readyLabel: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-semibold touch-manipulation active:scale-95",
        ready
          ? "bg-champagne-soft text-champagne-deep"
          : "bg-neutral-200 text-neutral-600",
      )}
    >
      {ready ? readyLabel : wipLabel}
    </button>
  )
}
