import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black/20 py-12">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        <span>Sentinel</span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        © 2025 Sentinel AI. Built for the Future of DevOps.
                    </p>

                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <Link href="#" className="hover:text-primary">Privacy</Link>
                        <Link href="#" className="hover:text-primary">Terms</Link>
                        <Link href="#" className="hover:text-primary">Twitter</Link>
                        <Link href="#" className="hover:text-primary">GitHub</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
