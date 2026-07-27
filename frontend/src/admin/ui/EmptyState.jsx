// EmptyState — centered placeholder for empty lists: icon, title, message, optional action.
import React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </div>
      )}
      {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
      {message && (
        <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
