"use client";

import { Spotlight } from "@/components/common/Spotlight";
import { Button } from "@/components/common/Button";
import { Bell, Moon, Sun, Shield, Trash2, Key, Globe } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [autoHeal, setAutoHeal] = useState(true);

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
                <p className="text-muted-foreground">Manage your preferences and agent configuration.</p>
            </div>

            {/* Appearance */}
            <Spotlight className="p-6 bg-white/5 border-white/5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sun className="h-5 w-5 text-yellow-400" /> Appearance
                </h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-sm text-muted-foreground">Use dark theme across the dashboard</p>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={cn(
                            "w-12 h-6 rounded-full transition-colors relative",
                            darkMode ? "bg-primary" : "bg-white/20"
                        )}
                    >
                        <span className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                            darkMode ? "left-7" : "left-1"
                        )} />
                    </button>
                </div>
            </Spotlight>

            {/* Notifications */}
            <Spotlight className="p-6 bg-white/5 border-white/5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-400" /> Notifications
                </h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">Receive alerts for critical incidents</p>
                        </div>
                        <button
                            onClick={() => setNotifications(!notifications)}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                notifications ? "bg-primary" : "bg-white/20"
                            )}
                        >
                            <span className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                notifications ? "left-7" : "left-1"
                            )} />
                        </button>
                    </div>
                </div>
            </Spotlight>

            {/* Agent Config */}
            <Spotlight className="p-6 bg-white/5 border-white/5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-400" /> Agent Configuration
                </h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Auto-Healing</p>
                            <p className="text-sm text-muted-foreground">Allow Sentinel to automatically fix issues</p>
                        </div>
                        <button
                            onClick={() => setAutoHeal(!autoHeal)}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                autoHeal ? "bg-primary" : "bg-white/20"
                            )}
                        >
                            <span className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                autoHeal ? "left-7" : "left-1"
                            )} />
                        </button>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                        <p className="font-medium mb-2">Severity Thresholds</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="p-3 rounded bg-white/5 text-center">
                                <p className="text-red-400 font-medium">Critical</p>
                                <p className="text-muted-foreground">Auto-heal</p>
                            </div>
                            <div className="p-3 rounded bg-white/5 text-center">
                                <p className="text-yellow-400 font-medium">Warning</p>
                                <p className="text-muted-foreground">Alert only</p>
                            </div>
                            <div className="p-3 rounded bg-white/5 text-center">
                                <p className="text-blue-400 font-medium">Info</p>
                                <p className="text-muted-foreground">Log only</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Spotlight>

            {/* API Keys */}
            <Spotlight className="p-6 bg-white/5 border-white/5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Key className="h-5 w-5 text-purple-400" /> API Keys
                </h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded bg-white/5">
                        <div className="font-mono text-sm text-muted-foreground">sk-sentinel-****-****-1234</div>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="glass" className="w-full">Generate New Key</Button>
                </div>
            </Spotlight>
        </div>
    );
}
