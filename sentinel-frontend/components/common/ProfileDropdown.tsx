"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, Settings, LogOut, LifeBuoy } from "lucide-react";
import Link from "next/link";

interface ProfileDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 top-12 w-64 rounded-2xl border border-white/20 shadow-2xl shadow-black/50 z-50 overflow-hidden"
                        style={{
                            background: "linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%)",
                            backdropFilter: "blur(24px) saturate(180%)",
                        }}
                    >
                        {/* User Info */}
                        <div className="p-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center">
                                    <User className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">DevOps Admin</p>
                                    <p className="text-xs text-muted-foreground">admin@sentinel.ai</p>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                            <Link
                                href="/dashboard/settings"
                                onClick={onClose}
                                className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <Settings className="h-4 w-4" /> Settings
                            </Link>
                            <Link
                                href="#"
                                onClick={onClose}
                                className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <LifeBuoy className="h-4 w-4" /> Help & Feedback
                            </Link>
                        </div>

                        {/* Logout */}
                        <div className="border-t border-white/10 py-2">
                            <button className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors">
                                <LogOut className="h-4 w-4" /> Sign Out
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
