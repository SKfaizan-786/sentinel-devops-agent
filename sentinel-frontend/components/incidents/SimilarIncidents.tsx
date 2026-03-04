import { Brain } from "lucide-react";

interface Incident {
    id: string;
    summary: string;
    mttrSeconds: number;
    score?: number;
    outcome?: string;
    createdAt?: number;
}

export function SimilarIncidents({ incidents }: { incidents: Incident[] }) {
    if (!incidents || incidents.length === 0) return null;

    return (
        <div className="bg-muted p-3 mt-3 rounded-lg text-sm border border-border/50">
            <div className="flex items-center gap-2 mb-2 text-violet-500 font-medium">
                <Brain className="h-4 w-4" />
                <span>Operational Memory: Found {incidents.length} similar past incidents</span>
            </div>
            <div className="space-y-2">
                {incidents.map((inc) => (
                    <div key={inc.id} className="bg-background/80 p-2 rounded border border-border text-xs flex justify-between items-start">
                        <div>
                            <span className="font-semibold block text-foreground truncate max-w-[200px]">{inc.summary}</span>
                            <span className="text-muted-foreground">Resolved in {inc.mttrSeconds}s • Outcome: {inc.outcome || 'Resolved'}</span>
                        </div>
                        {inc.score && (
                            <span className="bg-violet-500/10 text-violet-500 px-1.5 py-0.5 rounded text-[10px]">
                                {Math.round(inc.score * 100)}% match
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
