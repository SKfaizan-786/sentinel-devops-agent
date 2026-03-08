import { Link2 } from "lucide-react";

interface DependencyBadgeProps {
    affectedCount?: number;
}

export function DependencyBadge({ affectedCount }: DependencyBadgeProps) {
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <Link2 className="h-3 w-3" />
            Root Cause
            {affectedCount !== undefined && affectedCount > 0 && (
                <span className="opacity-80">({affectedCount} affected)</span>
            )}
        </span>
    );
}
