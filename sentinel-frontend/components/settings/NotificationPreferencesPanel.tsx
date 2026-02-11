'use client';
import { Bell, Volume2, Clock } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export function NotificationPreferencesPanel() {
  const prefs = useNotificationPreferences();

  return (
    <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Notification Preferences</h2>
        <p className="text-muted-foreground text-sm">
          Control notification behavior, sound alerts, and delivery channels.
        </p>
      </div>

      {/* Sound Settings */}
      <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider">
          Sound Settings
        </div>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox"
            checked={prefs.soundEnabled}
            onChange={(e) => prefs.updatePreferences({ soundEnabled: e.target.checked })}
            className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-2 focus:ring-primary/50"
          />
          <span className="font-medium text-white">Enable sound alerts</span>
        </label>

        {prefs.soundEnabled && (
          <div className="ml-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4">
              <Volume2 size={18} className="text-primary" />
              <input 
                type="range"
                min="0"
                max="100"
                value={prefs.volume}
                onChange={(e) => prefs.updatePreferences({ volume: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-sm w-10 text-right text-white font-medium">{prefs.volume}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Severity Filter */}
      <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider">
          Notification Severity
        </div>
        
        <select 
          value={prefs.filterBySeverity}
          onChange={(e) => prefs.updatePreferences({ 
            filterBySeverity: e.target.value as 'all' | 'warning' | 'critical'
          })}
          className="w-full border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
        >
          <option value="all" className="bg-gray-900">All notifications</option>
          <option value="warning" className="bg-gray-900">Warnings and above</option>
          <option value="critical" className="bg-gray-900">Critical only</option>
        </select>
        
        <p className="text-xs text-muted-foreground">
          {prefs.filterBySeverity === 'all' && 'Receive all notification types including info messages'}
          {prefs.filterBySeverity === 'warning' && 'Only receive warnings, errors, and critical alerts'}
          {prefs.filterBySeverity === 'critical' && 'Only receive critical alerts and incidents'}
        </p>
      </div>

      {/* Notification Channels */}
      <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider">
          Notification Channels
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={prefs.channels.toast}
              onChange={(e) => prefs.updatePreferences({
                channels: { ...prefs.channels, toast: e.target.checked }
              })}
              className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex-1">
              <span className="text-white font-medium">Toast notifications</span>
              <p className="text-xs text-muted-foreground">Show in-app notification popups</p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={prefs.channels.system}
              onChange={(e) => prefs.updatePreferences({
                channels: { ...prefs.channels, system: e.target.checked }
              })}
              className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex-1">
              <span className="text-white font-medium">System notifications</span>
              <p className="text-xs text-muted-foreground">Browser/desktop notifications</p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={prefs.channels.email}
              onChange={(e) => prefs.updatePreferences({
                channels: { ...prefs.channels, email: e.target.checked }
              })}
              className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex-1">
              <span className="text-white font-medium">Email notifications</span>
              <p className="text-xs text-muted-foreground">Receive alerts via email</p>
            </div>
          </label>
        </div>
      </div>

      {/* Do Not Disturb */}
      <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">
            Do Not Disturb Schedule
          </div>
        </div>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox"
            checked={prefs.dndSchedule.enabled}
            onChange={(e) => prefs.updatePreferences({
              dndSchedule: { ...prefs.dndSchedule, enabled: e.target.checked }
            })}
            className="w-4 h-4 rounded border-white/20 bg-white/10 text-primary focus:ring-2 focus:ring-primary/50"
          />
          <span className="font-medium text-white">Enable Do Not Disturb schedule</span>
        </label>

        {prefs.dndSchedule.enabled && (
          <div className="ml-6 flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex-1">
              <label className="block text-sm mb-2 text-white font-medium">From</label>
              <input 
                type="time"
                value={prefs.dndSchedule.start}
                onChange={(e) => prefs.updatePreferences({
                  dndSchedule: { ...prefs.dndSchedule, start: e.target.value }
                })}
                className="w-full border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-2 text-white font-medium">To</label>
              <input 
                type="time"
                value={prefs.dndSchedule.end}
                onChange={(e) => prefs.updatePreferences({
                  dndSchedule: { ...prefs.dndSchedule, end: e.target.value }
                })}
                className="w-full border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              />
            </div>
          </div>
        )}
        
        {prefs.dndSchedule.enabled && (
          <p className="text-xs text-muted-foreground ml-6">
            Notifications will be silenced from {prefs.dndSchedule.start} to {prefs.dndSchedule.end}
          </p>
        )}
      </div>

      {/* Status Indicator */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Bell size={18} className="text-primary mt-0.5" />
          <div>
            <p className="text-sm text-white font-medium">Preferences saved automatically</p>
            <p className="text-xs text-muted-foreground mt-1">
              All changes are applied immediately and persisted to your browser storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
