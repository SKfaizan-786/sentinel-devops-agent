"use client";

import { Button } from "@/components/common/Button";

export function ProfileSettings() {
    return (
        <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-xl font-semibold text-white mb-1">Profile Settings</h2>
                <p className="text-muted-foreground text-sm">Manage your personal account information.</p>
            </div>

            <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-linear-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-purple-500/20">
                    JD
                </div>
                <div>
                    <Button variant="outline" size="sm" className="mb-2">Change Avatar</Button>
                    <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="firstName" className="text-xs font-medium text-white uppercase tracking-wider">First Name</label>
                        <input id="firstName" type="text" defaultValue="John" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="lastName" className="text-xs font-medium text-white uppercase tracking-wider">Last Name</label>
                        <input id="lastName" type="text" defaultValue="Doe" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-white uppercase tracking-wider">Email Address</label>
                    <input type="email" defaultValue="john.doe@sentinel.ai" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all" />
                </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
                <Button id="save-settings-btn" shortcutHint="S">Save Changes</Button>
            </div>
        </div>
    );
}
