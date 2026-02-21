"use client";

import { TrendingDown, CircleDollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

interface SavingsCardProps {
    totalMonthlyEstimate: string;
    totalPotentialSavings: string;
    wastePercent: string;
}

export function SavingsCard({ totalMonthlyEstimate, totalPotentialSavings, wastePercent }: SavingsCardProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20 relative overflow-hidden group"
            >
                <div className="relative z-10">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Spend</p>
                    <h3 className="text-3xl font-bold text-foreground mb-2">${totalMonthlyEstimate}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CircleDollarSign className="w-3.5 h-3.5" />
                        Estimated based on cloud presets
                    </div>
                </div>
                <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:opacity-20 transition-opacity">
                    <CircleDollarSign size={160} />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-linear-to-br from-green-500/20 to-green-500/5 border border-green-500/20 relative overflow-hidden group"
            >
                <div className="relative z-10">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Potential Monthly Savings</p>
                    <h3 className="text-3xl font-bold text-green-500 mb-2">${totalPotentialSavings}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                        <TrendingDown className="w-4 h-4" />
                        {wastePercent}% of total spend can be optimized
                    </div>
                </div>
                <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingDown size={160} className="text-green-500" />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-center"
            >
                <p className="text-sm font-medium text-muted-foreground mb-4 text-center">Optimization Opportunity</p>
                <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${wastePercent}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="absolute top-0 left-0 h-full bg-green-500"
                    />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center uppercase tracking-wider font-semibold">
                    {parseFloat(wastePercent) > 30 ? 'High Opportunity' : 'Moderate Opportunity'}
                </p>
            </motion.div>
        </div>
    );
}
