"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon, Trash2, Check, Bell } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const NotificationIcon = ({ type }: { type: Notification["type"] }) => {
    switch (type) {
        case "error":
        case "incident":
            return (
                <div className="relative flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <AlertOctagon className="relative inline-flex h-5 w-5 text-red-500" />
                </div>
            );
        case "warning":
            return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
        case "success":
        case "resolved":
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case "info":
        default:
            return <Info className="h-5 w-5 text-blue-500" />;
    }
};

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
    const { notifications, markAllAsRead, clearAll, removeNotification } = useNotifications();

    // Mark all as read when opening (Persistence Logic: Only marks read, does NOT clear)
    useEffect(() => {
        if (isOpen) {
            markAllAsRead();
        }
    }, [isOpen, markAllAsRead]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    />
                    
                    {/* Panel */}
                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-12 w-80 max-h-[480px] bg-background border border-border rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 sidebar-header">
                            <div>
                                <h2 className="text-lg font-semibold tracking-tight">Notifications</h2>
                                <p className="text-xs text-muted-foreground">
                                    {notifications.length} total • {notifications.filter(n => !n.read).length} unread
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={markAllAsRead}
                                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors"
                                    title="Mark all as read"
                                >
                                    <Check className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-destructive transition-colors"
                                    title="Clear history"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <div className="w-px h-4 bg-border mx-1" />
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="flex-1 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                                        <Bell className="h-8 w-8 opacity-50" />
                                    </div>
                                    <p className="font-medium">No history found</p>
                                    <p className="text-xs text-muted-foreground mt-1">We&apos;ll notify you when something arrives.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 p-4">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                "group flex items-start gap-3 p-3 rounded-lg border transition-all",
                                                "border-border/40 bg-card/30 hover:bg-muted/50 hover:border-border/80"
                                            )}
                                        >
                                            {/* Status Icon */}
                                            <div className="flex-shrink-0 mt-0.5">
                                                <NotificationIcon type={notification.type} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className={cn("text-sm font-semibold leading-none", 
                                                        notification.type === 'incident' ? 'text-red-500' : 'text-foreground'
                                                    )}>
                                                        {notification.title}
                                                    </h3>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-auto">
                                                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
                                                    {notification.message}
                                                </p>
                                            </div>

                                            {/* Individual Delete Action (Hidden by default, visible on hover) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeNotification(notification.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 -mr-1 -mt-1 text-muted-foreground/40 hover:text-destructive transition-all"
                                                title="Remove"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
