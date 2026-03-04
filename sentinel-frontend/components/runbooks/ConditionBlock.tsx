import { Handle, Position } from '@xyflow/react';
import { Search } from 'lucide-react';
import { RunbookTrigger } from '../../lib/runbook-types';

const CONDITION_LABELS: Record<string, string> = {
    restart_count: 'Restart count > X in Y seconds',
    crash_loop: 'Crash Loop Detected',
    high_cpu: 'CPU > X% for Y seconds',
    high_memory: 'Memory > X% for Y seconds',
    health_check_fail: 'Health check failed',
};

interface ConditionBlockProps {
    data: {
        condition: RunbookTrigger;
        onEdit: () => void;
    };
}

export function ConditionBlock({ data }: ConditionBlockProps) {
    const { condition, onEdit } = data;

    return (
        <div className="relative border border-blue-500/30 rounded-lg p-3 bg-blue-500/5 min-w-48 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400">
                        IF {CONDITION_LABELS[condition.type] || condition.type}
                    </span>
                </div>
                <button
                    onClick={onEdit}
                    className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-500/40 transition-colors"
                >
                    Edit
                </button>
            </div>

            <div className="space-y-1">
                {condition.threshold !== undefined && (
                    <p className="text-[11px] text-muted-foreground">
                        <span className="text-blue-200/60">Threshold:</span> {condition.threshold}
                    </p>
                )}
                {condition.window !== undefined && (
                    <p className="text-[11px] text-muted-foreground">
                        <span className="text-blue-200/60">Window:</span> {condition.window}s
                    </p>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-blue-500 border-2 border-slate-900"
            />
        </div>
    );
}
