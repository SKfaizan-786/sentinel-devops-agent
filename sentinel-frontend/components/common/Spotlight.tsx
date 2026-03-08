"use client";

import React from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

export function Spotlight({
    children,
    className = "",
    spotlightColor = "rgba(50, 184, 198, 0.15)",
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    spotlightColor?: string;
    onClick?: () => void;
}) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({
        currentTarget,
        clientX,
        clientY,
    }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();

        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    function handleKeyDown(event: React.KeyboardEvent) {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onClick();
        }
    }

    return (
        <div
            className={cn(
                "group relative border border-border bg-card overflow-hidden rounded-xl",
                onClick && "cursor-pointer",
                className
            )}
            onMouseMove={handleMouseMove}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            tabIndex={onClick ? 0 : undefined}
            role={onClick ? "button" : undefined}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
                }}
            />
            <div className="relative h-full">{children}</div>
        </div>
    );
}
