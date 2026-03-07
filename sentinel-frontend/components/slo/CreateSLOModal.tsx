"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";

interface CreateSLOModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: {
        serviceId: string;
        serviceName?: string;
        targetAvailability: number;
        trackingWindow: string;
        alertThreshold?: number;
    }) => Promise<unknown>;
}

export function CreateSLOModal({ isOpen, onClose, onCreate }: CreateSLOModalProps) {
    const [serviceId, setServiceId] = useState("");
    const [serviceName, setServiceName] = useState("");
    const [targetAvailability, setTargetAvailability] = useState(99.9);
    const [trackingWindow, setTrackingWindow] = useState("1month");
    const [alertThreshold, setAlertThreshold] = useState(0.25);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await onCreate({
                serviceId: serviceId.trim(),
                serviceName: serviceName.trim() || serviceId.trim(),
                targetAvailability,
                trackingWindow,
                alertThreshold,
            });
            // Reset form
            setServiceId("");
            setServiceName("");
            setTargetAvailability(99.9);
            setTrackingWindow("1month");
            setAlertThreshold(0.25);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create SLO");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
                    >
                        <div className="bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <Plus className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-foreground">Define SLO</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Service ID */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                        Service ID *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={serviceId}
                                        onChange={(e) => setServiceId(e.target.value)}
                                        placeholder="e.g. api-gateway"
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm
                      placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30
                      transition-all"
                                    />
                                </div>

                                {/* Service Name */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={serviceName}
                                        onChange={(e) => setServiceName(e.target.value)}
                                        placeholder="e.g. API Gateway"
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm
                      placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30
                      transition-all"
                                    />
                                </div>

                                {/* Target Availability */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                        Target Availability
                                    </label>
                                    <select
                                        value={targetAvailability}
                                        onChange={(e) => setTargetAvailability(parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all"
                                    >
                                        <option value={99}>99% (~7.2h/month)</option>
                                        <option value={99.5}>99.5% (~3.6h/month)</option>
                                        <option value={99.9}>99.9% (~43.2m/month)</option>
                                        <option value={99.95}>99.95% (~21.6m/month)</option>
                                        <option value={99.99}>99.99% (~4.3m/month)</option>
                                    </select>
                                </div>

                                {/* Tracking Window */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                        Tracking Window
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: "1day", label: "1 Day" },
                                            { value: "7days", label: "7 Days" },
                                            { value: "1month", label: "1 Month" },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setTrackingWindow(opt.value)}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${trackingWindow === opt.value
                                                        ? "bg-primary/20 border-primary/40 text-primary"
                                                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Alert Threshold */}
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                        Alert at % remaining
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="5"
                                            max="50"
                                            step="5"
                                            value={alertThreshold * 100}
                                            onChange={(e) => setAlertThreshold(parseInt(e.target.value) / 100)}
                                            className="flex-1 accent-primary"
                                        />
                                        <span className="text-sm font-mono text-foreground w-10 text-right">
                                            {Math.round(alertThreshold * 100)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !serviceId.trim()}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground
                      hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all
                      flex items-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" />
                                                Create SLO
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
