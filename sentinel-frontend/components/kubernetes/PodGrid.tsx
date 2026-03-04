import React, { useState } from 'react';
import { K8sPod } from '@/hooks/useKubernetes';
import { RefreshCcw, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

interface PodGridProps {
    pods: K8sPod[];
    onDeletePod: (name: string) => void;
    namespace: string;
}

export const PodGrid: React.FC<PodGridProps> = ({ pods, onDeletePod, namespace }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPods = pods.filter(pod => 
        pod.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (phase: string, ready: boolean) => {
        if (!ready) return 'bg-red-500/10 border-red-500 text-red-500';
        if (phase === 'Running') return 'bg-green-500/10 border-green-500 text-green-500';
        if (phase === 'Pending') return 'bg-yellow-500/10 border-yellow-500 text-yellow-500';
        return 'bg-gray-500/10 border-gray-500 text-gray-500';
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Pods ({filteredPods.length})</h2>
                <input
                    type="text"
                    placeholder="Search pods..."
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPods.map(pod => (
                    <div key={pod.name} className={`relative p-4 rounded-lg border ${getStatusColor(pod.phase, pod.ready)}`}>
                        <div className="flex justify-between items-start">
                            <div className="overflow-hidden">
                                <h3 className="font-mono text-sm font-bold truncate" title={pod.name}>{pod.name}</h3>
                                <p className="text-xs opacity-75 mt-1">{pod.ip || 'No IP'}</p>
                            </div>
                            <button
                                onClick={() => {
                                    if(confirm(`Delete pod ${pod.name}?`)) onDeletePod(pod.name);
                                }}
                                className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                title="Delete Pod"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                             <div className="flex justify-between text-xs">
                                <span>Images:</span>
                                <span className='truncate w-24 text-right'>{pod.containers.map(c => c.image).join(', ')}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Restarts:</span>
                                <span className={pod.restartCount > 0 ? 'text-orange-400 font-bold' : ''}>{pod.restartCount}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Status:</span>
                                <span className="font-bold">{pod.phase}</span>
                            </div>
                        </div>

                       {/* Status Badge */}
                        <div className="absolute -top-2 -right-2">
                            {pod.ready ? 
                                <CheckCircle className="text-green-500 bg-slate-900 rounded-full" size={20} /> : 
                                <AlertCircle className="text-red-500 bg-slate-900 rounded-full" size={20} />
                            }
                        </div>
                    </div>
                ))}
            </div>
            
            {filteredPods.length === 0 && (
                 <div className="text-center py-10 text-gray-500">
                    No pods found matching your criteria.
                </div>
            )}
        </div>
    );
};
