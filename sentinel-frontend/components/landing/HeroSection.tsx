"use client";

import { Button } from "@/components/common/Button";
import { motion } from "framer-motion";
import { ArrowRight, Activity, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Spotlight } from "@/components/common/Spotlight";
import MountainScene from "@/components/mountain-scene";

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <MountainScene />
            </div>

            {/* Overlay to ensure text readability if needed, though MountainScene is dark */}
            <div className="absolute inset-0 bg-background/20 pointer-events-none z-0" />

            <div className="container px-4 md:px-6 relative z-10">
                <div className="flex flex-col items-center text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
                        Sentinel v1.0 is Live
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter"
                    >
                        Meet Your AI <br />
                        <span className="text-gradient-primary">DevOps Engineer</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-2xl/relaxed tracking-tight"
                    >
                        Autonomous monitoring. Predictive healing. Always awake.
                        <br className="hidden md:block" />
                        Sentinel predicts outages before they happen and fixes them instantly.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col gap-4 min-[400px]:flex-row pt-4"
                    >
                        <Link href="/dashboard">
                            <button className="liquid-glass px-8 h-12 flex items-center gap-2 text-white font-medium group">
                                View Live Dashboard
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                        <Link href="#how-it-works">
                            <Button variant="glass" size="lg" className="text-base h-12 px-8">
                                How It Works
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Stats / Social Proof */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 w-full max-w-4xl"
                    >
                        <Spotlight className="p-6 flex flex-col items-center justify-center text-center bg-white/5 border-white/5">
                            <div className="flex items-center gap-2 text-3xl font-bold text-white mb-2">
                                <Zap className="h-6 w-6 text-yellow-400" />
                                <span>&lt;500ms</span>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">Response Time</p>
                        </Spotlight>

                        <Spotlight className="p-6 flex flex-col items-center justify-center text-center bg-white/5 border-white/5">
                            <div className="flex items-center gap-2 text-3xl font-bold text-white mb-2">
                                <ShieldCheck className="h-6 w-6 text-green-400" />
                                <span>99.99%</span>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">Uptime Guarantee</p>
                        </Spotlight>

                        <Spotlight className="p-6 flex flex-col items-center justify-center text-center bg-white/5 border-white/5">
                            <div className="flex items-center gap-2 text-3xl font-bold text-white mb-2">
                                <Activity className="h-6 w-6 text-primary" />
                                <span>24/7</span>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">Autonomous Monitoring</p>
                        </Spotlight>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
