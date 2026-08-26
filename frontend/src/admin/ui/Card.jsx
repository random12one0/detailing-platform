// Card — themed surface with optional header (title/subtitle/action) and footer regions.
import React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, padded = true, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-card",
        padded && "p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// CardHeader — title + optional subtitle on the left, optional action node on the right.
export function CardHeader({ title, subtitle, action, className, children }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {title && (
          <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
        )}
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// CardFooter — bottom action row, separated by a hairline border.
export function CardFooter({ className, children }) {
  return (
    <div className={cn("mt-4 flex items-center gap-2 border-t border-border pt-3", className)}>
      {children}
    </div>
  );
}

export default Card;
