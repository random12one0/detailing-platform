// Modal — responsive overlay: centered Radix Dialog on sm+ screens, bottom sheet on mobile.
// Sticky header (title + close), scrollable body, optional sticky footer.
// Props: open, onClose, title, description, footer, children, size ("md" | "lg").
import React from "react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "./useMediaQuery";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const SIZES = { md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

function ModalBody({ title, description, footer, children, TitleCmp, DescCmp }) {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-card px-4 py-3 pr-12">
        <div className="min-w-0 flex-1">
          <TitleCmp className="text-lg font-semibold text-foreground">
            {title}
          </TitleCmp>
          {description && (
            <DescCmp className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </DescCmp>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      {footer && (
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border bg-card px-4 py-3">
          {footer}
        </div>
      )}
    </>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = "md",
  className,
}) {
  const isDesktop = useIsDesktop();
  const handleOpenChange = (o) => {
    if (!o) onClose?.();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-xl border-border bg-card p-0",
            SIZES[size],
            className
          )}
        >
          <ModalBody
            title={title}
            description={description}
            footer={footer}
            TitleCmp={DialogTitle}
            DescCmp={DialogDescription}
          >
            {children}
          </ModalBody>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 rounded-t-2xl border-border bg-card p-0",
          className
        )}
      >
        <ModalBody
          title={title}
          description={description}
          footer={footer}
          TitleCmp={SheetTitle}
          DescCmp={SheetDescription}
        >
          {children}
        </ModalBody>
      </SheetContent>
    </Sheet>
  );
}

export default Modal;
