"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/common/Button";
import { SentinelLogo } from "@/components/common/SentinelLogo";
import { Mail, Lock, ArrowRight, Github, Chrome } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate login
        await new Promise(r => setTimeout(r, 1500));
        setIsLoading(false);
        // Redirect to dashboard
        window.location.href = "/dashboard";
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0a0a0a] via-[#0f172a] to-[#0a0a0a] items-center justify-center p-12">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.15),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.1),transparent_50%)]" />
                </div>

                <div className="relative z-10 max-w-lg">
                    <Link href="/" className="flex items-center gap-3 mb-12">
                        <SentinelLogo size={40} />
                        <span className="text-3xl font-bold">Sentinel</span>
                    </Link>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold mb-6 leading-tight"
                    >
                        Welcome back to<br />
                        <span className="text-gradient-primary">autonomous DevOps</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-muted-foreground text-lg mb-8"
                    >
                        Your AI-powered infrastructure guardian is waiting. Sign in to access your dashboard.
                    </motion.p>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-3 gap-6"
                    >
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-primary">99.9%</div>
                            <div className="text-xs text-muted-foreground">Uptime</div>
                        </div>
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-green-400">2.4k</div>
                            <div className="text-xs text-muted-foreground">Issues Fixed</div>
                        </div>
                        <div className="text-center p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-2xl font-bold text-purple-400">24/7</div>
                            <div className="text-xs text-muted-foreground">Monitoring</div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0a0a0a]">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile Logo */}
                    <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
                        <SentinelLogo size={28} />
                        <span className="text-xl font-bold">Sentinel</span>
                    </Link>

                    <h2 className="text-3xl font-bold mb-2">Sign in</h2>
                    <p className="text-muted-foreground mb-8">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-primary hover:underline">
                            Create one
                        </Link>
                    </p>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <Button variant="outline" className="h-12 gap-2">
                            <Github className="h-5 w-5" />
                            GitHub
                        </Button>
                        <Button variant="outline" className="h-12 gap-2">
                            <Chrome className="h-5 w-5" />
                            Google
                        </Button>
                    </div>

                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0a0a0a] px-4 text-muted-foreground">or continue with email</span>
                        </div>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium">Password</label>
                                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Sign in
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-xs text-muted-foreground">
                        By signing in, you agree to our{" "}
                        <Link href="/terms" className="underline hover:text-white">Terms of Service</Link>
                        {" "}and{" "}
                        <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
