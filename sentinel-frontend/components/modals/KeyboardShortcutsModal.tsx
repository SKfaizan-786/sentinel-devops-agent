'use client';

import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsModal({
    isOpen,
    onClose,
}: KeyboardShortcutsModalProps) {
    if (!isOpen) return null;

    const categories = [
        {
            title: "Navigation",
            items: [
                { keys: ["J", "K"], description: "Scroll Up / Down" },
                { keys: ["G", "Then", "D"], description: "Go to Dashboard" },
                { keys: ["G", "Then", "S"], description: "Go to Services" },
                { keys: ["G", "Then", "I"], description: "Go to Incidents" },
                { keys: ["G", "Then", "L"], description: "Go to Logs" },
                { keys: ["G", "Then", "A"], description: "Go to Analytics" },
            ]
        },
        {
            title: "Actions",
            items: [
                { keys: ["N"], description: "New Incident" },
                { keys: ["R"], description: "Refresh Data" },
                { keys: ["C"], description: "Export Incidents" },
                { keys: ["S"], description: "Save Changes" }
            ]
        },
        {
            title: "System",
            items: [
                { keys: ["/"], description: "Global Search" },
                { keys: ["?"], description: "Show Keyboard Shortcuts" }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div 
                className="relative bg-background border border-border rounded-xl max-w-3xl w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="shortcuts-modal-title"
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-muted/20">
                    <div>
                        <h2 id="shortcuts-modal-title" className="text-xl font-bold text-foreground tracking-tight">⌨️ Keyboard Shortcuts</h2>
                        <p className="text-sm text-muted-foreground mt-1">Master Sentinel with these efficient keybindings.</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close keyboard shortcuts"
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground bg-white/5 rounded-md transition-colors hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {categories.map((category) => (
                        <div key={category.title}>
                            <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                                {category.title}
                            </h3>
                            <div className="space-y-3">
                                {category.items.map((item, idx) => (
                                    <div key={idx} className="flex items-start justify-between gap-4 group">
                                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors mt-0.5">{item.description}</span>
                                        <div className="flex items-center gap-1 flex-wrap justify-end">
                                            {item.keys.map((key, kIdx) => (
                                                <kbd key={kIdx} className="inline-flex h-6 items-center justify-center rounded border border-border bg-popover px-1.5 font-mono text-[10px] font-medium text-popover-foreground shadow-sm">
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-white/5 bg-muted/10 text-center">
                    <p className="text-xs text-muted-foreground">
                        Press <kbd className="inline-flex h-5 items-center justify-center rounded border border-border bg-popover px-1.5 font-mono text-[9px] font-medium text-popover-foreground shadow-sm mx-1">Esc</kbd> to dismiss this menu.
                    </p>
                </div>
            </div>
        </div>
    );
}
