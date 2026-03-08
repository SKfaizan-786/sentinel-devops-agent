import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { RunbookAction } from '@/lib/runbook-types';

const ACTION_LABELS: Record<string, string> = {
    restart_container: 'Restart Container',
    scale_replicas: 'Scale Replicas',
    run_command: 'Run custom command',
    notify_slack: 'Notify Slack',
    create_jira: 'Create Jira Ticket',
};

interface ActionBlockProps {
    data: {
        action: RunbookAction;
        onEdit: () => void;
    };
}

export function ActionBlock({ data }: ActionBlockProps) {
    const { action, onEdit } = data;

    return (
        <div className="relative border border-emerald-500/30 rounded-lg p-3 bg-emerald-500/5 min-w-48 shadow-lg backdrop-blur-sm">
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-emerald-500 border-2 border-slate-900"
            />

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">
                        THEN {ACTION_LABELS[action.type] || action.type}
                    </span>
                </div>
                <button
                    onClick={onEdit}
                    className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded hover:bg-emerald-500/40 transition-colors"
                >
                    Edit
                </button>
            </div>

            <div className="space-y-1">
                {Object.entries(action.parameters || {}).map(([key, value]) => (
                    <p key={key} className="text-[11px] text-muted-foreground truncate max-w-40">
                        <span className="text-emerald-200/60 uppercase text-[9px]">{key}:</span> {String(value)}
                    </p>
                ))}
                {(!action.parameters || Object.keys(action.parameters).length === 0) && (
                    <p className="text-[10px] italic text-muted-foreground/50">No parameters set</p>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-emerald-500 border-2 border-slate-900"
            />
        </div>
    );
}
