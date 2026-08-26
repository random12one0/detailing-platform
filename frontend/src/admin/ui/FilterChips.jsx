// FilterChips — horizontally scrollable single-select chip row driven by an options array.
import React from "react";
import { cn } from "@/lib/utils";
import { Chip } from "./Chip";

// options: [{ value, label, count? }]; value/onChange control the active chip.
export function FilterChips({ options = [], value, onChange, className }) {
  return (
    <div
      className={cn(
        "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => (
        <Chip
          key={opt.value}
          active={value === opt.value}
          count={opt.count}
          onClick={() => onChange?.(opt.value)}
          className="shrink-0"
        >
          {opt.label}
        </Chip>
      ))}
    </div>
  );
}

export default FilterChips;
