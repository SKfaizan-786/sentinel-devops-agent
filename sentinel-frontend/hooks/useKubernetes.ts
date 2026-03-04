import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Interfaces for our data
export interface K8sNamespace {
  name: string;
  status: string;
  created: string;
}

export interface K8sContainer {
  name: string;
  ready: boolean;
  restartCount: number;
  state: string;
  image: string;
}

export interface K8sPod {
  name: string;
  namespace: string;
  phase: string;
  ready: boolean;
  restartCount: number;
  containers: K8sContainer[];
  nodeName: string;
  ip: string;
  started: string;
  labels: Record<string, string>;
}

export interface K8sDeployment {
  name: string;
  namespace: string;
  replicas: {
    desired: number;
    ready: number;
    available: number;
    updated: number;
  };
  conditions: Array<{
    type: string;
    status: string;
    reason: string;
    message: string;
  }>;
  strategy: string;
  created: string;
}

export interface K8sEvent {
    type: string;
    reason: string;
    message: string;
    object: {
        kind: string;
        name: string;
        namespace: string;
    };
    count: number;
    lastSeen: string;
}


export function useKubernetes() {
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([]);
  const [currentNamespace, setCurrentNamespace] = useState<string>('default');
  const [pods, setPods] = useState<K8sPod[]>([]);
  const [deployments, setDeployments] = useState<K8sDeployment[]>([]);
  const [events, setEvents] = useState<K8sEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = 'http://localhost:4000/api/kubernetes'; // Adjust if env var needed

  const fetchNamespaces = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/namespaces`);
      setNamespaces(res.data);
    } catch (err) {
      console.error('Failed to fetch namespaces', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentNamespace) return;
    setLoading(true);
    try {
      const [podsRes, depsRes, eventsRes] = await Promise.all([
        axios.get(`${API_URL}/pods?namespace=${currentNamespace}`),
        axios.get(`${API_URL}/deployments?namespace=${currentNamespace}`),
        axios.get(`${API_URL}/events?namespace=${currentNamespace}`)
      ]);
      setPods(podsRes.data);
      setDeployments(depsRes.data);
      setEvents(eventsRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch Kubernetes data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentNamespace]);

  // Initial fetch
  useEffect(() => {
    fetchNamespaces();
  }, [fetchNamespaces]);

  // Fetch when namespace changes
  useEffect(() => {
    fetchData();
    // Poll every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Setup WebSocket listener for real-time events?
  // Ideally we would hook into the existing WebSocket context if available.
  // For now, allow manual refreshing or polling.
  
  // Actions
  const deletePod = async (name: string) => {
      try {
          await axios.post(`${API_URL}/pod/${currentNamespace}/${name}/delete`);
          fetchData(); // Refresh immediately
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  };

  const scaleDeployment = async (name: string, replicas: number) => {
      try {
          await axios.post(`${API_URL}/deployment/${currentNamespace}/${name}/scale`, { replicas });
          fetchData();
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  };

  const restartDeployment = async (name: string) => {
       try {
          await axios.post(`${API_URL}/deployment/${currentNamespace}/${name}/restart`);
          fetchData();
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  };

    const rollbackDeployment = async (name: string) => {
       try {
          await axios.post(`${API_URL}/deployment/${currentNamespace}/${name}/rollback`);
          fetchData();
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  };

  return {
    namespaces,
    currentNamespace,
    setNamespace: setCurrentNamespace,
    pods,
    deployments,
    events,
    loading,
    error,
    actions: {
        deletePod,
        scaleDeployment,
        restartDeployment,
        rollbackDeployment
    }
  };
}
