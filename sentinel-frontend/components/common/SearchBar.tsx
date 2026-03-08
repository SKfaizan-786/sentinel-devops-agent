import React, { InputHTMLAttributes, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    /**
     * The current search query string.
     */
    value: string;
    /**
     * Callback fired when the search query changes.
     * @param value - The new search query string.
     */
    onChange: (value: string) => void;
    /**
     * Optional className for the container div.
     */
    containerClassName?: string;
}

/**
 * A reusable search bar component with a search icon and a clear button.
 * The clear button only appears when there is text in the input.
 */
export function SearchBar({
    value,
    onChange,
    className,
    containerClassName,
    ...props
}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = () => {
        onChange("");
        inputRef.current?.focus();
    };

    return (
        <div className={cn("relative flex items-center w-full max-w-sm", containerClassName)}>
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                    className
                )}
                {...props}
            />
            {value.length > 0 && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-1 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

SearchBar.displayName = "SearchBar";
