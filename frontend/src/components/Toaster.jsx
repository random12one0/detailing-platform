// Toaster — renders the toasts dispatched via hooks/use-toast. The project had a
// use-toast hook but nothing ever rendered its toasts (the old Radix/Sonner render
// components were unused and removed), so every admin "Saved!" confirmation was
// silent. This is a self-contained renderer (no external toast primitives): mount
// it once near the app root. Uses fixed light-on-dark colors so it's readable over
// both the light public site and the dark admin.
import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function ToastItem({ toast, onDismiss }) {
  const { title, description, variant } = toast;

  // Auto-dismiss after a few seconds.
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isError = variant === "destructive";
  const isSuccess = variant === "success";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        isError
          ? "border-red-400/40 bg-red-600 text-white"
          : isSuccess
          ? "border-emerald-400/40 bg-emerald-600 text-white"
          : "border-white/15 bg-slate-900 text-white"
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold leading-snug">{title}</p>}
        {description && (
          <p className="mt-0.5 break-words text-xs leading-snug opacity-90">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded opacity-70 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const visible = toasts.filter((t) => t.open !== false);
  if (!visible.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:top-4">
      {visible.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

export default Toaster;
