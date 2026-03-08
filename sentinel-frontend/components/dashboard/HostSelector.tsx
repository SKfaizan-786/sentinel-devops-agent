"use client";

import React from 'react';
import { Server, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HostInfo {
    id: string;
    label: string;
    status: 'connected' | 'disconnected';
    containersRunning?: number;
}

interface HostSelectorProps {
    hosts: HostInfo[];
    selectedHostId: string | null;
    onHostChange: (hostId: string | null) => void;
    className?: string;
}

export function HostSelector({ hosts, selectedHostId, onHostChange, className }: HostSelectorProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedHost = hosts.find(h => h.id === selectedHostId);
    const connectedCount = hosts.filter(h => h.status === 'connected').length;

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm"
            >
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                    {selectedHost ? selectedHost.label : 'All Hosts'}
                </span>
                <span className="text-xs text-muted-foreground">
                    ({connectedCount}/{hosts.length})
                </span>
                <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "transform rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-border bg-card shadow-lg z-50">
                    <div className="p-2">
                        {/* All Hosts Option */}
                        <button
                            type="button"
                            onClick={() => {
                                onHostChange(null);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                                selectedHostId === null
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Server className="h-4 w-4" />
                                <span>All Hosts</span>
                            </div>
                            {selectedHostId === null && <Check className="h-4 w-4" />}
                        </button>

                        {hosts.length > 0 && (
                            <div className="my-2 border-t border-border" />
                        )}

                        {/* Individual Hosts */}
                        {hosts.map(host => (
                            <button
                                key={host.id}
                                type="button"
                                onClick={() => {
                                    onHostChange(host.id);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                                    selectedHostId === host.id
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-muted text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Server className="h-4 w-4" />
                                        <span className={cn(
                                            "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
                                            host.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                                        )} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block">{host.label}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {host.status === 'connected'
                                                ? `${host.containersRunning || 0} containers`
                                                : 'Disconnected'}
                                        </span>
                                    </div>
                                </div>
                                {selectedHostId === host.id && <Check className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
