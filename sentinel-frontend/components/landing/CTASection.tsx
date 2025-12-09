"use client";

import { Button } from "@/components/common/Button";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5" />
            <div className="container px-4 md:px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-3xl mx-auto space-y-8"
                >
                    <h2 className="text-3xl md:text-5xl font-bold">
                        Ready to stop waking up at 3 AM?
                    </h2>
                    <p className="text-xl text-muted-foreground">
                        Join the autonomous DevOps revolution. Let Sentinel handle the incidents while you sleep.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link href="/dashboard">
                            <Button size="lg" className="text-lg px-8 h-14">
                                Start Monitoring Now <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
