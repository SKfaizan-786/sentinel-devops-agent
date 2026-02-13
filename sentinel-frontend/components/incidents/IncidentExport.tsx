"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileJson, FileSpreadsheet, ChevronDown } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Incident } from "@/lib/mockData";
import { exportToCSV, exportToJSON } from "@/lib/export";

interface IncidentExportProps {
    incidents: Incident[];
    disabled?: boolean;
}

export function IncidentExport({ incidents, disabled = false }: IncidentExportProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleExportCSV = () => {
        exportToCSV(incidents, `incidents_${new Date().toISOString().split("T")[0]}`);
        setIsOpen(false);
    };

    const handleExportJSON = () => {
        exportToJSON(incidents, `incidents_${new Date().toISOString().split("T")[0]}`);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled || incidents.length === 0}
                className="flex items-center gap-2"
            >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-background border border-white/10 rounded-lg shadow-xl overflow-hidden">
                    <button
                        onClick={handleExportCSV}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                    >
                        <FileSpreadsheet className="h-4 w-4 text-green-400" />
                        Export as CSV
                    </button>
                    <button
                        onClick={handleExportJSON}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                    >
                        <FileJson className="h-4 w-4 text-blue-400" />
                        Export as JSON
                    </button>
                </div>
            )}
        </div>
    );
}
