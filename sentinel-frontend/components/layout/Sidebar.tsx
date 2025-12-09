"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Server,
    Activity,
    FileText,
    Settings,
    ShieldCheck,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Services", href: "/dashboard/services", icon: Server },
    { name: "Incidents", href: "/dashboard/incidents", icon: Activity },
    { name: "Logs", href: "/dashboard/logs", icon: FileText },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 80 : 280 }}
            className="fixed left-0 top-0 bottom-0 z-40 flex flex-col glass border-r border-white/10 transition-all duration-300"
        >
            {/* Logo Area */}
            <div className={cn("flex items-center h-16 px-6 border-b border-white/5", collapsed ? "justify-center" : "justify-between")}>
                <Link href="/" className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-primary/20 p-1.5 rounded-lg shrink-0">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-bold text-xl tracking-tight"
                        >
                            Sentinel
                        </motion.span>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeNav"
                                    className="absolute inset-0 bg-primary/10 border-l-2 border-primary"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "group-hover:text-white")} />
                            {!collapsed && (
                                <span className="font-medium truncate">{item.name}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
                >
                    {collapsed ? <ChevronRight className="h-5 w-5" /> : <div className="flex items-center gap-2"><ChevronLeft className="h-5 w-5" /> <span>Collapse</span></div>}
                </button>
            </div>
        </motion.aside>
    );
}
