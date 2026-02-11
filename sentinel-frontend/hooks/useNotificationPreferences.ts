import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationPreferences {
  soundEnabled: boolean;
  volume: number; // 0-100
  filterBySeverity: 'all' | 'warning' | 'critical';
  channels: {
    toast: boolean;
    system: boolean;
    email: boolean;
  };
  dndSchedule: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
  };
}

export const useNotificationPreferences = create<
  NotificationPreferences & {
    updatePreferences: (updates: Partial<NotificationPreferences>) => void;
    isInDndPeriod: () => boolean;
  }
>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      volume: 75,
      filterBySeverity: 'all',
      channels: { toast: true, system: true, email: false },
      dndSchedule: { enabled: false, start: '22:00', end: '08:00' },
      updatePreferences: (updates) => set(updates),
      isInDndPeriod: () => {
        const state = get();
        if (!state.dndSchedule.enabled) return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startHour, startMin] = state.dndSchedule.start.split(':').map(Number);
        const [endHour, endMin] = state.dndSchedule.end.split(':').map(Number);

        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        // Handle overnight DND periods (e.g., 22:00 to 08:00)
        if (startTime > endTime) {
          return currentTime >= startTime || currentTime < endTime;
        }

        return currentTime >= startTime && currentTime < endTime;
      },
    }),
    { name: 'notification-preferences' }
  )
);
