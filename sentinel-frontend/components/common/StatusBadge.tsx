import { getStatusColor, Status } from '@/lib/theme';

interface StatusBadgeProps {
    status: Status;
    label?: string;
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({
    status,
    label,
    showDot = true,
    size = 'md'
}: StatusBadgeProps) {
    const colors = getStatusColor(status);

    const sizes = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5'
    };

    return (
        <span className={`
      inline-flex items-center gap-1.5 rounded-full font-medium border
      ${colors.bg} ${colors.text} ${colors.border} ${sizes[size]}
    `}>
            {showDot && (
                <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
            )}
            {label || status}
        </span>
    );
}
