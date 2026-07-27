// Button — admin action button (variants primary/secondary/ghost/danger, sizes sm/md,
// full-width option, 44px min touch target). Wraps the base ui/button styling via cva.
import React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const adminButton = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-base ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-muted",
        danger:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      },
      size: {
        // Both sizes clear the 44px min touch target on their primary axis.
        sm: "min-h-[44px] px-3 text-sm",
        md: "min-h-[44px] px-5 text-base",
      },
      fullWidth: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", fullWidth: false },
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(adminButton({ variant, size, fullWidth }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "AdminButton";

export { adminButton };
export default Button;
