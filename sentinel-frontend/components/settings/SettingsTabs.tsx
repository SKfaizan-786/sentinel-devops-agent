"use client";

import { User, Bell, Key, ShieldAlert, Settings } from "lucide-react";

export function SettingsTabs({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
    const tabs = [
        { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
        { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
        { id: "notification-preferences", label: "Notification Preferences", icon: <Settings className="h-4 w-4" /> },
        { id: "api-keys", label: "API Keys", icon: <Key className="h-4 w-4" /> },
        { id: "danger", label: "Danger Zone", icon: <ShieldAlert className="h-4 w-4" /> },
    ];

    return (
        <div className="flex flex-col gap-1 pr-8 w-64 shrink-0">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id
                        ? "bg-white/10 text-white shadow-sm border border-white/5"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                        }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
