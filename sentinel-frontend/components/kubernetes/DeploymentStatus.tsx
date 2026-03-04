import React from 'react';
import { K8sDeployment } from '@/hooks/useKubernetes';
import { ArrowUp, RefreshCcw, RotateCcw } from 'lucide-react';

interface DeploymentStatusProps {
    deployments: K8sDeployment[];
    onScale: (name: string, replicas: number) => void;
    onRestart: (name: string) => void;
    onRollback: (name: string) => void;
}

export const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ deployments, onScale, onRestart, onRollback }) => {

    return (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Deployments</h2>
            <div className="space-y-4">
                {deployments.map(dep => (
                    <div key={dep.name} className="bg-slate-900/50 p-4 rounded border border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold">{dep.name}</h3>
                            <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">
                                {dep.replicas.ready} / {dep.replicas.desired} Ready
                            </span>
                        </div>
                        
                        <div className="w-full bg-slate-700 h-1.5 rounded-full mb-4 overflow-hidden">
                            <div 
                                className="bg-blue-500 h-full transition-all duration-500" 
                                style={{ width: `${(dep.replicas.ready / (dep.replicas.desired || 1)) * 100}%` }}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const count = prompt('New replica count:', dep.replicas.desired.toString());
                                    if (count && !isNaN(parseInt(count))) onScale(dep.name, parseInt(count));
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1 px-2 rounded flex items-center justify-center gap-1"
                            >
                                <ArrowUp size={12} /> Scale
                            </button>
                             <button
                                onClick={() => {
                                    if(confirm(`Restart deployment ${dep.name}?`)) onRestart(dep.name);
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1 px-2 rounded flex items-center justify-center gap-1"
                            >
                                <RefreshCcw size={12} /> Restart
                            </button>
                             <button
                                onClick={() => {
                                    if(confirm(`Rollback deployment ${dep.name}?`)) onRollback(dep.name);
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-xs py-1 px-2 rounded flex items-center justify-center gap-1"
                            >
                                <RotateCcw size={12} /> Rollback
                            </button>
                        </div>
                    </div>
                ))}

                {deployments.length === 0 && (
                    <div className="text-gray-500 text-center text-sm">No deployments in this namespace.</div>
                )}
            </div>
        </div>
    );
};
