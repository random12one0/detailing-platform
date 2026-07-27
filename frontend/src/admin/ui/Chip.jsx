// Chip — small selectable/removable pill; active state uses the accent token.
import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  active = false,
  count,
  onClick,
  onRemove,
  className,
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      {count != null && (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs",
            active ? "bg-accent-foreground/20" : "bg-muted"
          )}
        >
          {count}
        </span>
      )}
      {onRemove && (
        <X
          className="size-3.5 opacity-70 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      )}
    </button>
  );
}

export default Chip;
