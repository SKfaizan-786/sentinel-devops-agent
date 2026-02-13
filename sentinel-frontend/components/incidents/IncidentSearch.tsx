"use client";

import { Search, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface IncidentSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function IncidentSearch({
    value,
    onChange,
    placeholder = "Search incidents by title, service, or root cause...",
}: IncidentSearchProps) {
    const [localValue, setLocalValue] = useState(value);

    // Sync with external value
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounced onChange
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [localValue, onChange, value]);

    const handleClear = useCallback(() => {
        setLocalValue("");
        onChange("");
    }, [onChange]);

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground/60 transition-all"
                aria-label="Search incidents"
            />
            {localValue && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
