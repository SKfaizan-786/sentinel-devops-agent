"use client";

import { useNotifications, Notification } from "@/hooks/useNotifications";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ToastIcon = ({ type }: { type: Notification["type"] }) => {
  switch (type) {
    case "error":
    case "incident":
      return <AlertOctagon className="h-5 w-5 text-red-500" />;
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

export const ToastContainer = () => {
  const { notifications } = useNotifications();
  const [visibleToasts, setVisibleToasts] = useState<Notification[]>([]);
  const [mountedAt] = useState(() => Date.now());
  const processedIds = useState(() => new Set<string>())[0]; // Stable Set ref

  // Register Service Worker
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .catch(err => console.error("Service Worker registration failed:", err));
    }
  }, []);

  // Only show notifications that arrived AFTER the component mounted
  // This prevents the user from being bombarded with old notifications on page load
  useEffect(() => {
    // Filter for new, unprocessed notifications
    const newNotifications = notifications.filter(n => 
        n.timestamp > mountedAt && !processedIds.has(n.id)
    );

    if (newNotifications.length > 0) {
        // Mark as processed
        newNotifications.forEach(n => processedIds.add(n.id));

        // Add to visible toasts (newest first)
        setTimeout(() => {
            setVisibleToasts(prev => {
                const updated = [...newNotifications, ...prev];
                return updated.slice(0, 5); // Limit to 5
            });
        }, 0);
    }
  }, [notifications, mountedAt, processedIds]);

  // Handle auto-dismissal
  useEffect(() => {
    if (visibleToasts.length > 0) {
      
      const timer = setInterval(() => {
         const now = Date.now();
         setVisibleToasts(prev => prev.filter(n => now - n.timestamp < 5000));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [visibleToasts]);

  const dismissToast = (id: string) => {
    setVisibleToasts((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              "pointer-events-auto w-80 rounded-lg border bg-background p-4 shadow-lg backdrop-blur-sm",
              "border-border/50 bg-card/95 supports-[backdrop-filter]:bg-background/60"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <ToastIcon type={toast.type} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{toast.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="flex-shrink-0 -mr-1 -mt-1 p-1 text-muted-foreground/50 hover:text-foreground transition-colors rounded-sm hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
