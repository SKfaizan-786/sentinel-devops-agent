"use client";

import { useLogs, LogLevel } from "@/hooks/useLogs";
import { useNotifications } from "@/hooks/useNotifications";
import { Search, Filter, Trash2, ShieldAlert, CheckCircle, Info, Ban, Activity, Copy, Terminal } from "lucide-react";

export function LogViewer() {
    const { logs, search, setSearch, filterLevel, setFilterLevel, clearLogs, isPaused, setIsPaused } = useLogs();
    const { addNotification } = useNotifications();

    const handleCopyLatest = () => {
        if (logs.length === 0) return;
        // Fix 1: Full clipboard API guard before calling writeText
        if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.writeText) {
            addNotification({
                type: "error",
                title: "Copy failed",
                message: "Clipboard API not available. Use HTTPS or a modern browser.",
            });
            return;
        }
        navigator.clipboard.writeText(logs[0].message).then(() => {
            addNotification({
                type: "success",
                title: "Copied to clipboard",
                message: "Latest log entry copied to your clipboard.",
            });
        }).catch(() => {
            addNotification({
                type: "error",
                title: "Copy failed",
                message: "Could not copy to clipboard. Ensure the page is served over HTTPS.",
            });
        });
    };

    const handleClearLogs = () => {
        clearLogs();
        addNotification({
            type: "info",
            title: "Logs cleared",
            message: isPaused
                ? "All log entries have been removed."
                : "Log display cleared. Live entries will resume shortly.",
        });
    };

    const getIcon = (level: LogLevel) => {
        switch (level) {
            case "error":   return <Ban className="w-4 h-4 text-red-400" />;
            case "warn":    return <ShieldAlert className="w-4 h-4 text-amber-400" />;
            case "success": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case "debug":   return <Terminal className="w-4 h-4 text-slate-400" />;
            default:        return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    const getRowStyle = (level: LogLevel) => {
        switch (level) {
            case "error":   return "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500";
            case "warn":    return "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500";
            case "success": return "bg-emerald-500/5 hover:bg-emerald-500/10 border-l-2 border-l-emerald-500";
            case "debug":   return "bg-slate-500/5 hover:bg-slate-500/10 border-l-2 border-l-slate-500";
            default:        return "hover:bg-white/5 border-l-2 border-l-transparent";
        }
    };

    const getBadgeColor = (level: LogLevel) => {
        switch (level) {
            case "error":   return "text-red-400";
            case "warn":    return "text-amber-400";
            case "success": return "text-emerald-400";
            case "debug":   return "text-slate-400";
            default:        return "text-blue-400";
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search logs by message or service..."
                        aria-label="Search logs"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-500 text-slate-200"
                    />
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <select
                            value={filterLevel}
                            onChange={(e) => setFilterLevel(e.target.value as LogLevel | "all")}
                            aria-label="Filter by log level"
                            className="appearance-none pl-4 pr-10 py-2.5 bg-black/20 border border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 cursor-pointer hover:bg-black/30 transition-colors"
                        >
                            <option value="all">All Levels</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                            <option value="success">Success</option>
                            <option value="debug">Debug</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        aria-pressed={isPaused}
                        aria-label={isPaused ? "Resume live log stream" : "Pause live log stream"}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${isPaused
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                    >
                        <Activity className={`w-4 h-4 ${!isPaused ? 'animate-pulse' : ''}`} />
                        {isPaused ? "Paused" : "Live"}
                    </button>

                    <button
                        onClick={handleCopyLatest}
                        disabled={logs.length === 0}
                        aria-label="Copy latest log entry to clipboard"
                        className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Copy className="w-4 h-4" />
                        Copy Latest
                    </button>

                    {/* Fix 2: aria-label added, Fix 3: disabled when no logs */}
                    <button
                        onClick={handleClearLogs}
                        disabled={logs.length === 0}
                        aria-label="Clear logs"
                        title="Clear Logs"
                        className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Log List */}
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                <div className="flex gap-6 px-6 py-4 bg-black/20 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest w-32 shrink-0">Timestamp</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Event Details</span>
                </div>

                <div className="divide-y divide-white/5 overflow-y-auto flex-1 custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-300 mb-1">No logs found</h3>
                            <p className="text-slate-500 max-w-sm">
                                There are no logs matching your current filters. Try adjusting your search criteria or triggering some system activity.
                            </p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className={`flex gap-6 px-6 py-4 transition-all group ${getRowStyle(log.level)}`}>
                                <div className="flex flex-col gap-1.5 w-32 shrink-0 pt-0.5">
                                    <span className="text-xs font-mono text-slate-400 group-hover:text-slate-300 transition-colors">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className="text-[10px] text-slate-600/60 font-mono truncate select-all" title={log.id}>
                                        #{log.id}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            {getIcon(log.level)}
                                            <span className={`text-xs font-bold uppercase tracking-wider ${getBadgeColor(log.level)}`}>
                                                {log.level}
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            {log.service}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 font-mono leading-relaxed break-all">
                                        {log.message}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}