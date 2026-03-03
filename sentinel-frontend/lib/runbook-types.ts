export type ConditionType = 'high_cpu' | 'high_memory' | 'crash_loop' | 'health_check_fail' | 'error_rate_spike';

export type ActionType = 'restart_container' | 'scale_replicas' | 'run_command' | 'notify_slack' | 'create_jira';

export interface RunbookTrigger {
    type: ConditionType;
    threshold?: number;
    window?: number;
}

export interface RunbookAction {
    type: ActionType;
    parameters?: Record<string, any>;
}

export interface Runbook {
    id: string;
    name: string;
    description: string;
    triggers: RunbookTrigger[];
    actions: RunbookAction[];
    enabled: boolean;
    version: number;
    created_at?: string;
    updated_at?: string;
}

export interface RunbookTemplate {
    type: string;
    label: string;
    description: string;
    defaultParameters?: Record<string, any>;
}
