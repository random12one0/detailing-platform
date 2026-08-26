// Field — form row: label + optional helper/error text wrapping any control.
// Also exports consistently-styled input controls: TextInput, Select, Textarea,
// Switch (labeled), MoneyInput, TimeInput. All controls clear a 44px touch target.
import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea as BaseTextarea } from "@/components/ui/textarea";
import { Switch as BaseSwitch } from "@/components/ui/switch";
import {
  Select as RadixSelect,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

let fieldCounter = 0;
const useFieldId = (id) => {
  const ref = React.useRef(id);
  if (ref.current == null) ref.current = `field-${++fieldCounter}`;
  return ref.current;
};

// Shared control base so every input looks/feels identical and is finger-friendly.
export const controlBase =
  "min-h-[44px] w-full rounded-lg border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function Field({ label, helper, error, htmlFor, required, className, children }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        helper && <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}

// TextInput — labeled text input built on Field + ui/input.
export const TextInput = React.forwardRef(
  ({ label, helper, error, required, id, className, containerClassName, ...props }, ref) => {
    const fieldId = useFieldId(id);
    return (
      <Field
        label={label}
        helper={helper}
        error={error}
        required={required}
        htmlFor={fieldId}
        className={containerClassName}
      >
        <Input
          id={fieldId}
          ref={ref}
          className={cn(controlBase, error && "border-destructive", className)}
          {...props}
        />
      </Field>
    );
  }
);
TextInput.displayName = "TextInput";

// MoneyInput — numeric money entry with a leading currency symbol and decimal keypad.
export const MoneyInput = React.forwardRef(
  ({ label, helper, error, required, id, symbol = "$", className, containerClassName, ...props }, ref) => {
    const fieldId = useFieldId(id);
    return (
      <Field
        label={label}
        helper={helper}
        error={error}
        required={required}
        htmlFor={fieldId}
        className={containerClassName}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {symbol}
          </span>
          <Input
            id={fieldId}
            ref={ref}
            type="text"
            inputMode="decimal"
            className={cn(controlBase, "pl-7", error && "border-destructive", className)}
            {...props}
          />
        </div>
      </Field>
    );
  }
);
MoneyInput.displayName = "MoneyInput";

// TimeInput — native time picker styled to match the other controls.
export const TimeInput = React.forwardRef(
  ({ label, helper, error, required, id, className, containerClassName, ...props }, ref) => {
    const fieldId = useFieldId(id);
    return (
      <Field
        label={label}
        helper={helper}
        error={error}
        required={required}
        htmlFor={fieldId}
        className={containerClassName}
      >
        <Input
          id={fieldId}
          ref={ref}
          type="time"
          className={cn(controlBase, error && "border-destructive", className)}
          {...props}
        />
      </Field>
    );
  }
);
TimeInput.displayName = "TimeInput";

// Textarea — labeled multiline input.
export const Textarea = React.forwardRef(
  ({ label, helper, error, required, id, className, containerClassName, rows = 3, ...props }, ref) => {
    const fieldId = useFieldId(id);
    return (
      <Field
        label={label}
        helper={helper}
        error={error}
        required={required}
        htmlFor={fieldId}
        className={containerClassName}
      >
        <BaseTextarea
          id={fieldId}
          ref={ref}
          rows={rows}
          className={cn(
            "w-full rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring",
            error && "border-destructive",
            className
          )}
          {...props}
        />
      </Field>
    );
  }
);
Textarea.displayName = "FieldTextarea";

// Select — labeled dropdown driven by an options array: [{ value, label }].
export function Select({
  label,
  helper,
  error,
  required,
  id,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  containerClassName,
  className,
  disabled,
}) {
  const fieldId = id || undefined;
  return (
    <Field
      label={label}
      helper={helper}
      error={error}
      required={required}
      htmlFor={fieldId}
      className={containerClassName}
    >
      <RadixSelect value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={fieldId}
          className={cn(controlBase, "justify-between", error && "border-destructive", className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </RadixSelect>
    </Field>
  );
}

// Switch — labeled on/off toggle laid out as a full-width row.
export function Switch({ label, helper, checked, onChange, id, disabled, className }) {
  const fieldId = useFieldId(id);
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1", className)}>
      <div className="min-w-0">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
      <BaseSwitch
        id={fieldId}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-accent"
      />
    </div>
  );
}

export default Field;
