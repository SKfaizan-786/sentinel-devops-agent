"use client";

interface FailureContext {
    operation?: string | null;
    service?: string | null;
    errorMessage?: string | null;
    duration?: number | null;
    spanId?: string | null;
    traceId?: string | null;
}

interface FailurePointProps {
    context?: FailureContext | null;
}

export function FailurePoint({ context }: FailurePointProps) {
    if (!context) {
        return (
            <div className="p-4 rounded-lg border border-white/10 bg-white/5 text-sm text-muted-foreground">
                No failing span detected in this trace window.
            </div>
        );
    }

    return (
        <div className="p-4 rounded-lg border border-red-500/40 bg-red-500/10 space-y-1 text-sm">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-red-300">Failure Point</span>
                {context.service && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-200 text-xs">
                        {context.service}
                    </span>
                )}
            </div>
            {context.operation && (
                <p className="text-foreground">
                    <span className="font-medium">Operation:</span> {context.operation}
                </p>
            )}
            {context.errorMessage && (
                <p className="text-foreground">
                    <span className="font-medium">Error:</span> {context.errorMessage}
                </p>
            )}
            {typeof context.duration === "number" && (
                <p className="text-muted-foreground">
                    <span className="font-medium">Duration:</span> {context.duration}μs
                </p>
            )}
        </div>
    );
}

