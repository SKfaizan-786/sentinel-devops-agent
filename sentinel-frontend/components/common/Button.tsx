"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
                glass: "glass hover:bg-white/10 text-white border-white/20",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "glass" | null;
    size?: "default" | "sm" | "lg" | "icon" | null;
    shortcutHint?: string;
    shortcutPosition?: "top" | "bottom";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, shortcutHint, shortcutPosition, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        const [isInsideHeader, setIsInsideHeader] = React.useState(false);
        const kbdRef = React.useRef<HTMLElement>(null);

        React.useEffect(() => {
            if (kbdRef.current) {
                setIsInsideHeader(!!kbdRef.current.closest("header"));
            }
        }, [shortcutHint]);

        const finalPosition = shortcutPosition || (isInsideHeader ? "bottom" : "top");

        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }), !asChild && shortcutHint && "group relative")}
                ref={ref}
                {...props}
            >
                {children}
                {shortcutHint && !asChild && (
                    <kbd
                        ref={kbdRef}
                        aria-hidden="true"
                        className={cn(
                            "pointer-events-none absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:inline-flex h-6 items-center gap-1 rounded border border-border bg-popover px-1.5 font-mono text-[10px] font-medium text-popover-foreground whitespace-nowrap shadow-sm z-50",
                            finalPosition === "bottom" ? "-bottom-8" : "-top-8"
                        )}
                    >
                        {shortcutHint}
                    </kbd>
                )}
            </Comp>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
