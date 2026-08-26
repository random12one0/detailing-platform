// StatCard — compact metric tile: label, big value, optional sublabel, trend and icon.
import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

export function StatCard({
  label,
  value,
  sublabel,
  trend, // { direction: "up" | "down", value: "+12%" }
  icon: Icon,
  className,
  ...props
}) {
  return (
    <Card className={cn("flex flex-col gap-1", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="size-4 shrink-0 text-accent" />}
      </div>
      <span className="text-2xl font-semibold leading-tight text-foreground">
        {value}
      </span>
      <div className="flex items-center gap-2">
        {sublabel && (
          <span className="text-sm text-muted-foreground">{sublabel}</span>
        )}
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              trend.direction === "down" ? "text-destructive" : "text-success"
            )}
          >
            {trend.direction === "down" ? (
              <ArrowDownRight className="size-3.5" />
            ) : (
              <ArrowUpRight className="size-3.5" />
            )}
            {trend.value}
          </span>
        )}
      </div>
    </Card>
  );
}

export default StatCard;
