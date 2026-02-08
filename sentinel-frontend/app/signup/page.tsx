"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/common/Button";
import { SentinelLogo } from "@/components/common/SentinelLogo";
import { Mail, Lock, ArrowRight, Github, Chrome, User, Check } from "lucide-react";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate signup
        await new Promise(r => setTimeout(r, 1500));
        setIsLoading(false);
        // Redirect to dashboard
        window.location.href = "/dashboard";
    };

    const passwordStrength = password.length >= 8 ? (password.match(/[A-Z]/) && password.match(/[0-9]/) ? "strong" : "medium") : "weak";

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Signup Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0a0a0a]">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-md"
                >
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 mb-8">
                        <SentinelLogo size={28} />
                        <span className="text-xl font-bold">Sentinel</span>
                    </Link>

                    <h2 className="text-3xl font-bold mb-2">Create your account</h2>
                    <p className="text-muted-foreground mb-8">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                            Sign in
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

                    {/* Signup Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Work Email</label>
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
                            <label className="text-sm font-medium">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a strong password"
                                    className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                    required
                                />
                            </div>
                            {/* Password Strength Indicator */}
                            {password && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 flex gap-1">
                                        <div className={`h-1 flex-1 rounded-full ${passwordStrength === "weak" ? "bg-red-500" : "bg-green-500"}`} />
                                        <div className={`h-1 flex-1 rounded-full ${passwordStrength === "medium" || passwordStrength === "strong" ? "bg-green-500" : "bg-white/10"}`} />
                                        <div className={`h-1 flex-1 rounded-full ${passwordStrength === "strong" ? "bg-green-500" : "bg-white/10"}`} />
                                    </div>
                                    <span className={`text-xs ${passwordStrength === "weak" ? "text-red-400" : passwordStrength === "medium" ? "text-yellow-400" : "text-green-400"}`}>
                                        {passwordStrength}
                                    </span>
                                </div>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating account...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Get Started Free
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-xs text-muted-foreground">
                        By creating an account, you agree to our{" "}
                        <Link href="/terms" className="underline hover:text-white">Terms</Link>
                        {" "}and{" "}
                        <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>
                    </p>
                </motion.div>
            </div>

            {/* Right Side - Features */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-bl from-[#0a0a0a] via-[#0f172a] to-[#0a0a0a] items-center justify-center p-12">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.15),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(168,85,247,0.1),transparent_50%)]" />
                </div>

                <div className="relative z-10 max-w-lg">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold mb-6 leading-tight"
                    >
                        Start your journey to<br />
                        <span className="text-gradient-primary">zero-downtime ops</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-muted-foreground text-lg mb-10"
                    >
                        Join thousands of teams who trust Sentinel to keep their systems running smoothly.
                    </motion.p>

                    {/* Features List */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4"
                    >
                        {[
                            "Unlimited services monitoring",
                            "AI-powered incident detection",
                            "Automatic self-healing workflows",
                            "Real-time alerting & notifications",
                            "Full audit trail & compliance logs",
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                className="flex items-center gap-3"
                            >
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Check className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-white">{feature}</span>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Testimonial */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10"
                    >
                        <p className="text-white/80 italic mb-4">
                            &quot;Sentinel reduced our MTTR by 85%. Our on-call engineers finally get to sleep through the night.&quot;
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-500" />
                            <div>
                                <div className="font-semibold text-white">Sarah Chen</div>
                                <div className="text-xs text-muted-foreground">VP of Engineering, TechCorp</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
