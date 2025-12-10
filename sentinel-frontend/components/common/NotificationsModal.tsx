"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, CheckCircle, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    type: "incident" | "resolved" | "info";
    title: string;
    message: string;
    time: string;
}

const mockNotifications: Notification[] = [
    { id: "1", type: "incident", title: "High Latency Alert", message: "Payments Worker experiencing 120ms+ latency", time: "2m ago" },
    { id: "2", type: "resolved", title: "Incident Resolved", message: "Search Service recovered automatically", time: "15m ago" },
    { id: "3", type: "info", title: "Auto-Heal Triggered", message: "Increased connection pool for Primary DB", time: "1h ago" },
];

const NotificationIcon = ({ type }: { type: Notification["type"] }) => {
    switch (type) {
        case "incident": return <AlertTriangle className="h-5 w-5 text-red-500" />;
        case "resolved": return <CheckCircle className="h-5 w-5 text-green-500" />;
        case "info": return <Info className="h-5 w-5 text-blue-500" />;
    }
};

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
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
                        className="fixed inset-0 bg-black/50 z-40"
                    />
                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="fixed right-4 top-16 w-96 max-h-[80vh] overflow-y-auto rounded-2xl border border-white/20 shadow-2xl shadow-black/50 z-50"
                        style={{
                            background: "linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%)",
                            backdropFilter: "blur(24px) saturate(180%)",
                        }}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="font-semibold">Notifications</h3>
                            <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="divide-y divide-white/5">
                            {mockNotifications.map((notification) => (
                                <div key={notification.id} className="p-4 hover:bg-white/5 transition-colors cursor-pointer">
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">
                                            <NotificationIcon type={notification.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-white">{notification.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{notification.message}</p>
                                            <p className="text-xs text-muted-foreground/50 mt-1 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {notification.time}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-white/10 text-center">
                            <button className="text-sm text-primary hover:underline">View all notifications</button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
