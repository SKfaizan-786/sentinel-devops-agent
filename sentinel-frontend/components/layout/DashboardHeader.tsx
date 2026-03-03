"use client";

import { Bell, Search, User, RotateCw, Pause, Play } from "lucide-react";
import { Button } from "@/components/common/Button";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { ProfileDropdown } from "@/components/common/ProfileDropdown";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useState } from "react";
import { useNotifications, NotificationState } from "@/hooks/useNotifications";
import { useAutoRefresh, RefreshInterval } from "@/hooks/useAutoRefresh";

interface DashboardHeaderProps {
    onRefresh?: () => void;
}

export function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
    const { enabled, updateEnabled, interval, updateInterval, manualRefresh } =
        useAutoRefresh({ onRefresh: onRefresh || (() => { }) });

    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const unreadCount = useNotifications((state: NotificationState) => state.unreadCount);

    return (
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30">
            {/* Search - Hidden on mobile, visible on tablet+ */}
            <div className="hidden md:flex items-center gap-4 w-full max-w-md">
                <Button 
                    variant="outline" 
                    className="w-full justify-start text-muted-foreground bg-muted/50 border-border rounded-full hover:bg-muted font-normal text-sm px-4 py-1.5 h-auto transition-all"
                    onClick={() => document.querySelector<HTMLInputElement>('[data-search]')?.focus()}
                    shortcutHint="/"
                >
                    <Search className="mr-2 h-4 w-4" />
                    Global Search
                </Button>
                {/* Hidden real input to satisfy focus logic if needed */}
                <input
                    type="text"
                    data-search
                    className="hidden"
                />
            </div>

            {/* Spacer for mobile to push icons to right */}
            <div className="md:hidden flex-1 pl-12" />

            <div className="flex items-center gap-4 relative">
                {onRefresh && (
                    <div className="flex items-center gap-2 mr-2 border-r pr-4 border-border">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={manualRefresh}
                            className="text-muted-foreground hover:text-foreground"
                            title="Refresh now"
                            shortcutHint="R"
                        >
                            <RotateCw className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateEnabled(!enabled)}
                            className={enabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}
                            title={enabled ? "Disable auto-refresh" : "Enable auto-refresh"}
                        >
                            {enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>

                        {enabled && (
                            <select
                                value={interval}
                                onChange={(e) => updateInterval(e.target.value as RefreshInterval)}
                                className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                                <option value="5s">5s</option>
                                <option value="10s">10s</option>
                                <option value="30s">30s</option>
                                <option value="1m">1m</option>
                                <option value="5m">5m</option>
                            </select>
                        )}
                    </div>
                )}
                <ThemeToggle />
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground"
                    onClick={() => setNotificationsOpen(true)}
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                </Button>
                <NotificationCenter isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

                <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="h-8 w-8 rounded-full bg-linear-to-tr from-primary to-purple-500 flex items-center justify-center ring-2 ring-border hover:ring-primary/50 transition-all"
                >
                    <User className="h-4 w-4 text-white" />
                </button>
                <ProfileDropdown isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
            </div>
        </header>
    );
}

