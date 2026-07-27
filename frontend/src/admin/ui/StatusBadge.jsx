// StatusBadge — booking-status pill using the canonical getStatusColor palette from lib/format.
import React from "react";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/format";

// Human-readable labels for the raw status values.
const LABELS = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
  pending: "Pending",
};

export function StatusBadge({ status, label, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        getStatusColor(status),
        className
      )}
    >
      {label || LABELS[status] || status || "Unknown"}
    </span>
  );
}

export default StatusBadge;
