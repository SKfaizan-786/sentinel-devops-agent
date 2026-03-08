'use client';

import { Sidebar } from "@/components/layout/Sidebar";
// import { DashboardHeader } from "@/components/layout/DashboardHeader";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {


    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
            <Sidebar />
            <div className="flex-1 min-w-0 flex flex-col lg:pl-[280px] transition-all duration-300">
                {/* <DashboardHeader /> */}
                <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">
                    {children}
                </main>
            </div>

        </div>
    );
}
