"use client";

import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/common/Button";
import { NotificationsModal } from "@/components/common/NotificationsModal";
import { ProfileDropdown } from "@/components/common/ProfileDropdown";
import { useState } from "react";

export function DashboardHeader() {
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4 w-full max-w-md">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search services, incidents, logs..."
                        className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-white"
                    onClick={() => setNotificationsOpen(true)}
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                </Button>
                <NotificationsModal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

                <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center ring-2 ring-white/10 hover:ring-primary/50 transition-all"
                >
                    <User className="h-4 w-4 text-white" />
                </button>
                <ProfileDropdown isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
            </div>
        </header>
    );
}

