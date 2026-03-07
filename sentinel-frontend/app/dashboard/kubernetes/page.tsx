'use client';

import { useKubernetes } from '@/hooks/useKubernetes';
import { ClusterOverview } from '@/components/kubernetes/ClusterOverview';
import { PodGrid } from '@/components/kubernetes/PodGrid';
import { DeploymentStatus } from '@/components/kubernetes/DeploymentStatus';
import { EventStream } from '@/components/kubernetes/EventStream';

export default function KubernetesPage() {
  const { 
    namespaces,
    currentNamespace,
    setNamespace,
    pods,
    deployments,
    events,
    loading,
    actions
  } = useKubernetes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kubernetes Monitoring</h1>
        <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Namespace:</label>
            <select
            value={currentNamespace}
            onChange={(e) => setNamespace(e.target.value)}
            className="rounded-md border bg-slate-900 border-slate-700 px-3 py-2 text-sm"
            >
            <option value="default">default</option>
            {namespaces.length > 0 ? namespaces.map(ns => (
                <option key={ns.name} value={ns.name}>{ns.name}</option>
            )) : <option disabled>Loading...</option>}
            </select>
        </div>
      </div>

      <ClusterOverview 
        pods={pods} 
        deployments={deployments} 
        namespaces={namespaces} 
        loading={loading}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeploymentStatus 
            deployments={deployments} 
            onScale={actions.scaleDeployment}  // Corrected signature passing
            onRestart={actions.restartDeployment}
            onRollback={actions.rollbackDeployment}
        />
        <EventStream 
            events={events} 
            namespace={currentNamespace}
        />
      </div>
      
      <PodGrid 
        pods={pods} 
        onDeletePod={actions.deletePod} 
        namespace={currentNamespace} 
      />
    </div>
  );
}
