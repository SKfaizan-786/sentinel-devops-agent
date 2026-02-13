"use client";

import Link from "next/link";
import { Button } from "@/components/common/Button";
import { SentinelLogo } from "@/components/common/SentinelLogo";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useWebSocketContext } from "@/lib/WebSocketContext";
import { Wifi, WifiOff } from "lucide-react";

export function Header() {
    const [scrolled, setScrolled] = useState(false);
    const { isConnected } = useWebSocketContext();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
                scrolled ? "bg-background/80 backdrop-blur-md border-white/10 py-3" : "bg-transparent py-5"
            )}
        >
            <div className="container px-4 md:px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                    <SentinelLogo size={32} />
                    <span>Sentinel</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                    <Link href="#features" className="hover:text-primary transition-colors">
                        Features
                    </Link>
                    <Link href="#how-it-works" className="hover:text-primary transition-colors">
                        How It Works
                    </Link>
                    <Link href="/demo" className="hover:text-primary transition-colors">
                        Live Demo
                    </Link>
                </nav>

                <div className="flex items-center gap-4">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        isConnected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )} title={isConnected ? "System Connected" : "System Disconnected"}>
                        {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        <span className="hidden sm:inline">{isConnected ? "Online" : "Offline"}</span>
                    </div>

                    <Link href="/login" className="hidden md:block text-sm font-medium hover:text-primary">
                        Login
                    </Link>
                    <Link href="/dashboard">
                        <Button size="sm" className="shadow-lg shadow-primary/20">
                            Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
