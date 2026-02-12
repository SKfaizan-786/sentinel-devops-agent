import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useNotificationPreferences } from "./useNotificationPreferences";

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "incident"
  | "resolved";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "read">,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

export const useNotifications = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      addNotification: (notification) => {
        // Get preferences
        const prefs = useNotificationPreferences.getState();
        
        // Check if in DND period
        if (prefs.isInDndPeriod()) {
          return; // Silently ignore notifications during DND
        }

        // Check severity filter
        const severityMap = {
          'info': 0,
          'success': 0,
          'warning': 1,
          'error': 2,
          'incident': 2,
          'resolved': 0
        };
        
        const notificationSeverity = severityMap[notification.type] || 0;
        const filterLevel = prefs.filterBySeverity === 'all' ? 0 : 
                           prefs.filterBySeverity === 'warning' ? 1 : 2;
        
        if (notificationSeverity < filterLevel) {
          return; // Filter out notifications below threshold
        }

        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          read: false,
        };

        // Always add to store for persistence
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

       
        // Play sound for critical alerts if enabled
        if (prefs.soundEnabled && (notification.type === "error" || notification.type === "incident")) {
          try {
            const audio = new Audio("/sounds/alert.mp3");
            audio.volume = prefs.volume / 100; // Use preference volume
            
            // Check if play is supported and handle the promise
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                // Auto-play was prevented or file not found
                // checking for 404 specifically isn't easy, but this prevents crash
                console.warn("Audio playback failed (possibly 404 or autoplay policy):", error);
              });
            }
          } catch (e) {
            console.error("Audio initialization failed", e);
          }
        }

        // Trigger System Notification if channel enabled and permission granted
        if (
          prefs.channels.system &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          if (document.hidden) {
            new window.Notification(notification.title, {
              body: notification.message,
              icon: "/icon.png", // consistent with manifest
            });
          }
        }
      },
      markAsRead: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (notification && !notification.read) {
            return {
              notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n,
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            };
          }
          return state;
        }),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      clearAll: () => set({ notifications: [], unreadCount: 0 }),
      removeNotification: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.read;
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          };
        }),
    }),
    {
      name: "sentinel-notifications", // name of the item in the storage (must be unique)
    },
  ),
);
