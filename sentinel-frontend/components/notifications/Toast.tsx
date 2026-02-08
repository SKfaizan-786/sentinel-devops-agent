"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const ToastItem = ({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) => {
  const { id, type, title, message } = notification;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const icons = {
    info: <Info className="h-5 w-5 text-blue-400" />,
    success: <CheckCircle className="h-5 w-5 text-green-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
    error: <AlertOctagon className="h-5 w-5 text-red-500" />,
    incident: <AlertOctagon className="h-5 w-5 text-red-500 animate-pulse" />,
    resolved: <CheckCircle className="h-5 w-5 text-green-400" />,
  };

  const bgStyles = {
    info: "bg-blue-500/10 border-blue-500/20",
    success: "bg-green-500/10 border-green-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    error: "bg-red-500/10 border-red-500/20",
    incident: "bg-red-500/20 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    resolved: "bg-green-500/10 border-green-500/20",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-lg border shadow-lg backdrop-blur-md mb-3",
        bgStyles[type] || bgStyles.info
      )}
    >
      <div className="flex w-full p-4 relative">
        <div className="flex-shrink-0 pt-0.5">{icons[type]}</div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium text-gray-100">{title}</p>
          <p className="mt-1 text-sm text-gray-400">{message}</p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            type="button"
            className="inline-flex rounded-md text-gray-400 hover:text-white focus:outline-none"
            onClick={() => onDismiss(id)}
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const ToastContainer = () => {
    const [visibleToasts, setVisibleToasts] = useState<Notification[]>([]);

    useEffect(() => {
        // Subscribe to the store to detect new notifications
        const unsubscribe = useNotifications.subscribe(
            (state, prevState) => {
                // Check if a new notification was added
                if (state.notifications.length > prevState.notifications.length) {
                    const newest = state.notifications[0];
                    // Only show if it's very recent (less than 1s ago) to avoid stale toasts
                    if (Date.now() - newest.timestamp < 1000) {
                         setVisibleToasts((prev) => {
                            // Avoid duplicates
                            if (prev.find(t => t.id === newest.id)) return prev;
                            return [...prev, newest];
                        });
                    }
                }
            }
        );
        return () => unsubscribe();
    }, []);

    const handleDismiss = (id: string) => {
        setVisibleToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[100]"
        >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
            <AnimatePresence mode="popLayout">
            {visibleToasts.map((notification) => (
                <ToastItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={handleDismiss}
                />
            ))}
            </AnimatePresence>
        </div>
        </div>
    );
}
