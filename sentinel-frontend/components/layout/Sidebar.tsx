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
    ChevronLeft,
    ChevronRight,
    BarChart3,
    Menu,
    X,
    CircleDollarSign,
} from "lucide-react";
import { SentinelLogo } from "@/components/common/SentinelLogo";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Services", href: "/dashboard/services", icon: Server },
    { name: "Incidents", href: "/dashboard/incidents", icon: Activity },
    { name: "Logs", href: "/dashboard/logs", icon: FileText },
    { name: "FinOps", href: "/dashboard/finops", icon: CircleDollarSign },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
    { name: "Terms", href: "/terms", icon: FileText },
];

interface SidebarContentProps {
    isMobile?: boolean;
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
    setMobileOpen: (v: boolean) => void;
    pathname: string;
}

const SidebarContent = ({ isMobile = false, collapsed, setCollapsed, setMobileOpen, pathname }: SidebarContentProps) => (
    <>
        {/* Logo Area */}
        <div className={cn(
            "flex items-center h-16 px-6 border-b border-white/5",
            collapsed && !isMobile ? "justify-center" : "justify-between"
        )}>
            <Link href="/" className="flex items-center gap-3 overflow-hidden">
                <SentinelLogo size={28} className="shrink-0" />
                {(!collapsed || isMobile) && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-bold text-xl tracking-tight"
                    >
                        Sentinel
                    </motion.span>
                )}
            </Link>
            {isMobile && (
                <button
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground"
                    aria-label="Close menu"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
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
                                layoutId={isMobile ? "activeNavMobile" : "activeNav"}
                                className="absolute inset-0 bg-primary/10 border-l-2 border-primary"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <item.icon className={cn("h-5 w-5 shrink-0 relative z-10", isActive ? "text-primary" : "group-hover:text-white")} />
                        {(!collapsed || isMobile) && (
                            <span className="font-medium truncate relative z-10">{item.name}</span>
                        )}
                    </Link>
                );
            })}
        </nav>

        {/* Footer / Collapse Toggle (desktop only) */}
        {!isMobile && (
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-expanded={!collapsed}
                >
                    {collapsed ? (
                        <ChevronRight className="h-5 w-5" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <ChevronLeft className="h-5 w-5" />
                            <span>Collapse</span>
                        </div>
                    )}
                </button>
            </div>
        )}
    </>
);

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const prevPathname = useRef(pathname);

    // Close mobile menu on route change
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (prevPathname.current !== pathname) {
            if (mobileOpen) {
                // Defer execution to avoid synchronous state update in effect
                timer = setTimeout(() => setMobileOpen(false), 0);
            }
            prevPathname.current = pathname;
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileOpen(false);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border text-foreground"
                aria-label="Open menu"
            >
                <Menu className="h-6 w-6" />
            </button>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                        />
                        {/* Mobile Sidebar */}
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] flex flex-col glass border-r border-border lg:hidden"
                        >
                            <SidebarContent
                                isMobile
                                collapsed={collapsed}
                                setCollapsed={setCollapsed}
                                setMobileOpen={setMobileOpen}
                                pathname={pathname}
                            />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 80 : 280 }}
                className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col glass border-r border-border transition-all duration-300"
            >
                <SidebarContent
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    setMobileOpen={setMobileOpen}
                    pathname={pathname}
                />
            </motion.aside>
        </>
    );
}
