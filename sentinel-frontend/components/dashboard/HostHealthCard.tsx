import React from 'react';
import { HostInfo } from '@/hooks/useHosts';

interface HostHealthCardProps {
    host: HostInfo;
}

export const HostHealthCard: React.FC<HostHealthCardProps> = ({ host }) => {
    const isConnected = host.status === 'connected';

    return (
        <div className={`p-4 rounded-xl border ${isConnected ? 'bg-card border-border' : 'bg-destructive/10 border-destructive/20'}`}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {host.label}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {host.status === 'connected' ? 'Online' : 'Offline'}
                        </span>
                        {host.swarm && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Swarm</span>
                        )}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono mt-1">{host.id} ({host.type})</p>
                </div>
            </div>

            {isConnected ? (
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Containers</span>
                        <p className="text-xl font-bold">{host.containersRunning ?? '-'} <span className="text-sm font-normal text-muted-foreground">/ {host.containers ?? '-'}</span></p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Est. CPU</span>
                        <p className="text-xl font-bold">
                            {host.aggregatedMetrics?.cpu ?? '-'}
                            {host.aggregatedMetrics?.cpu != null ? '%' : ''}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Est. Mem</span>
                        <p className="text-xl font-bold">
                            {host.aggregatedMetrics?.memoryPercent ?? '-'}
                            {host.aggregatedMetrics?.memoryPercent != null ? '%' : ''}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-destructive mt-2 bg-destructive/10 p-2 rounded">
                    <strong>Error:</strong> {host.error || 'Connection failed'}
                </div>
            )}
        </div>
    );
};
