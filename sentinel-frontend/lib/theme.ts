export const statusColors = {
    healthy: {
        bg: 'bg-status-healthy/20',
        text: 'text-status-healthy',
        border: 'border-status-healthy',
        dot: 'bg-status-healthy'
    },
    warning: {
        bg: 'bg-status-warning/20',
        text: 'text-status-warning',
        border: 'border-status-warning',
        dot: 'bg-status-warning'
    },
    critical: {
        bg: 'bg-status-critical/20',
        text: 'text-status-critical',
        border: 'border-status-critical',
        dot: 'bg-status-critical'
    },
    unknown: {
        bg: 'bg-status-unknown/20',
        text: 'text-status-unknown',
        border: 'border-status-unknown',
        dot: 'bg-status-unknown'
    },
    degraded: { // Added based on ServiceCard usage
        bg: 'bg-status-warning/20',
        text: 'text-status-warning',
        border: 'border-status-warning',
        dot: 'bg-status-warning'
    },
    down: { // Added based on ServiceCard usage
        bg: 'bg-status-critical/20',
        text: 'text-status-critical',
        border: 'border-status-critical',
        dot: 'bg-status-critical'
    },
    info: { // Added for IncidentCard usage
        bg: 'bg-status-info/20',
        text: 'text-status-info',
        border: 'border-status-info',
        dot: 'bg-status-info'
    }
} as const;

export const severityColors = {
    low: statusColors.healthy,
    medium: statusColors.warning,
    warning: statusColors.warning,
    high: {
        bg: 'bg-orange-500/20',
        text: 'text-orange-400',
        border: 'border-orange-500',
        dot: 'bg-orange-500'
    },
    critical: statusColors.critical,
    info: statusColors.info,
    unknown: statusColors.unknown
} as const;

export type Status = keyof typeof statusColors;
export type Severity = keyof typeof severityColors;

export function getStatusColor(status: string): typeof statusColors[Status] {
    return statusColors[status as Status] || statusColors.unknown;
}

export function getSeverityColor(severity: string): typeof severityColors[Severity] {
    return severityColors[severity as Severity] || severityColors.unknown;
}
