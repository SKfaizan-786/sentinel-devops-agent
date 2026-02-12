"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { NotificationPreferencesPanel } from "@/components/settings/NotificationPreferencesPanel";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { useState } from "react";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");

    return (
        <div>
            <DashboardHeader />
            <div className="p-4 lg:p-6">
                <div className="container mx-auto max-w-5xl pb-20 space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Settings</h1>
                        <p className="text-muted-foreground">Manage your workspace configuration and preferences.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Sidebar Navigation */}
                        <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

                        {/* Content Area */}
                        <div className="flex-1 min-h-[400px]">
                            {activeTab === "profile" && <ProfileSettings />}
                            {activeTab === "notifications" && <NotificationSettings />}
                            {activeTab === "api-keys" && <ApiKeySettings />}
                            {activeTab === "danger" && (
                                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl text-red-400 text-sm">
                                    <h3 className="font-bold mb-2">Danger Zone</h3>
                                    <p>Irreversible actions like deleting your account or workspace reside here. Proceed with caution.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
