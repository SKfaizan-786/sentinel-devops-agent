"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CostBreakdownChartProps {
    containers: Array<{
        name: string;
        monthlyEstimate: number;
    }>;
}

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

export function CostBreakdownChart({ containers }: CostBreakdownChartProps) {
    const data = containers
        .slice(0, 7)
        .map(c => ({
            name: c.name,
            value: c.monthlyEstimate
        }));

    if (containers.length > 7) {
        const others = containers.slice(7).reduce((acc, c) => acc + c.monthlyEstimate, 0);
        data.push({ name: 'Others', value: parseFloat(others.toFixed(2)) });
    }

    return (
        <div className="glass border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold">Monthly Spend Distribution</h3>
            </div>
            <div className="p-6 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={110}
                            paddingAngle={5}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={1500}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => [`$${value}`, 'Monthly Cost']}
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff'
                            }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
