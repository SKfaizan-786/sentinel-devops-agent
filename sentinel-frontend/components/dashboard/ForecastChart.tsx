"use client";

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';

interface ForecastChartProps {
    history: { timestamp: string; value: number }[];
    label: string;
    threshold?: number;
    prediction?: {
        slope: number;
        timeToFailure: number;
    };
    unit?: string;
}

export function ForecastChart({ history, label, threshold, prediction, unit = '%' }: ForecastChartProps) {
    const data = useMemo(() => {
        const baseData = history.map(h => ({
            ...h,
            type: 'actual'
        }));

        if (prediction && prediction.slope > 0 && baseData.length > 0) {
            const lastPoint = baseData[baseData.length - 1];
            const lastVal = lastPoint.value;
            const forecastPoints = [];
            
            // Project 10 minutes (10 points if 1 min interval, or 5s interval?)
            // Assuming history is roughly 1 point per 5s or 1s? 
            // In useMetrics, history is generated every 2s per 30 points.
            
            for (let i = 1; i <= 10; i++) {
                // prediction.slope is per minute possibly? 
                // Let's just visualize a simple line up
                const projectedVal = Math.min(100, lastVal + (prediction.slope * i));
                forecastPoints.push({
                    timestamp: `+${i}m`,
                    value: projectedVal,
                    type: 'forecast'
                });
            }
            return [...baseData, ...forecastPoints];
        }

        return baseData;
    }, [history, prediction]);

    return (
        <div className="h-[200px] w-full">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">{label} Forecast</h4>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                        formatter={(value, name) => {
                            const n = typeof value === 'number' ? value : Number(value);
                            return [`${Number.isFinite(n) ? n.toFixed(1) : value}${unit}`, label];
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        connectNulls
                    />
                    {threshold !== undefined && (
                        <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="3 3" label="Critical" />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
