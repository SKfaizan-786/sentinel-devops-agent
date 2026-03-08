"use client";

export interface TraceTag {
    key: string;
    value: string;
}

export interface TraceSpan {
    spanID: string;
    operationName: string;
    startTime: number;
    duration: number;
    tags?: TraceTag[];
}

export interface TraceLike {
    traceID?: string;
    spans?: TraceSpan[];
}

interface TraceTimelineProps {
    trace?: TraceLike | null;
}

export function TraceTimeline({ trace }: TraceTimelineProps) {
    if (!trace?.spans || trace.spans.length === 0) {
        return <p className="text-sm text-muted-foreground">No trace data</p>;
    }

    const minTime = Math.min(...trace.spans.map(s => s.startTime));
    const maxTime = Math.max(...trace.spans.map(s => s.startTime + s.duration));
    const totalDuration = Math.max(maxTime - minTime, 1);

    return (
        <div className="space-y-1">
            {trace.spans.map(span => {
                const offset = ((span.startTime - minTime) / totalDuration) * 100;
                const width = (span.duration / totalDuration) * 100;
                const isError = span.tags?.some(t => t.key === "otel.status_code" && t.value === "ERROR");

                return (
                    <div key={span.spanID} className="flex items-center gap-2 text-xs">
                        <span className="w-40 truncate text-muted-foreground">{span.operationName}</span>
                        <div className="flex-1 h-4 bg-white/5 rounded relative overflow-hidden">
                            <div
                                className={`absolute h-full rounded ${isError ? "bg-red-500/60" : "bg-blue-500/40"}`}
                                style={{
                                    left: `${Math.max(0, Math.min(offset, 100))}%`,
                                    width: `${Math.max(width, 0.5)}%`,
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

