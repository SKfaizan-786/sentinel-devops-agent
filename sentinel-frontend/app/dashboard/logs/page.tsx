"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { LogViewer } from "@/components/logs/LogViewer";

export default function LogsPage() {
    return (
        <div>
            <DashboardHeader />
            <div className="p-4 lg:p-6">
                <div className="container mx-auto max-w-6xl pb-20 space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">System Logs</h1>
                        <p className="text-muted-foreground">Real-time activity logs from all sentinel services and agents.</p>
                    </div>

                    <LogViewer />
                </div>
            </div>
        </div>
    );
}
