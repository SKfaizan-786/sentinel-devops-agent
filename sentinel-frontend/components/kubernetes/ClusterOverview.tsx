import React from 'react';
import { K8sPod, K8sDeployment, K8sNamespace } from '@/hooks/useKubernetes';

interface ClusterOverviewProps {
    pods: K8sPod[];
    deployments: K8sDeployment[];
    namespaces: K8sNamespace[];
    loading: boolean;
}

export const ClusterOverview: React.FC<ClusterOverviewProps> = ({ pods, deployments, namespaces, loading }) => {
    const totalPods = pods.length;
    const unhealthyPods = pods.filter(p => !p.ready || p.phase !== 'Running').length;
    const restartCount = pods.reduce((acc, p) => acc + p.restartCount, 0);
    const totalDeployments = deployments.length;
    
    // Calculate cluster health score based on pod availability
    const healthScore = totalPods > 0 ? Math.round(((totalPods - unhealthyPods) / totalPods) * 100) : 100;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="text-gray-400 text-sm font-medium">Cluster Health</h3>
                <div className="mt-2 flex items-baseline">
                    <span className={`text-3xl font-bold ${healthScore < 80 ? 'text-red-500' : 'text-green-500'}`}>
                        {healthScore}%
                    </span>
                    <span className="ml-2 text-sm text-gray-500">Score</span>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="text-gray-400 text-sm font-medium">Pods</h3>
                <div className="mt-2 flex items-baseline">
                    <span className="text-3xl font-bold text-white">{totalPods}</span>
                    <span className="ml-2 text-sm text-red-400">{unhealthyPods} Unhealthy</span>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="text-gray-400 text-sm font-medium">Deployments</h3>
                <div className="mt-2 flex items-baseline">
                    <span className="text-3xl font-bold text-white">{totalDeployments}</span>
                    <span className="ml-2 text-sm text-blue-400">Apps</span>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="text-gray-400 text-sm font-medium">Total Restarts</h3>
                <div className="mt-2 flex items-baseline">
                    <span className="text-3xl font-bold text-orange-400">{restartCount}</span>
                    <span className="ml-2 text-sm text-gray-500">Events</span>
                </div>
            </div>
        </div>
    );
};
