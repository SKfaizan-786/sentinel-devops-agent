# Kubernetes Setup Guide

Sentinel integrates with Kubernetes using the standard Kubernetes API client. It supports connecting to both local clusters (like Minikube, Docker Desktop) and remote clusters (EKS, GKE, AKS).

## 🚀 Prerequisites

1. **Kubernetes Cluster**: Ensure you have a running cluster.
2. **Kubeconfig**: Sentinel relies on the standard kubeconfig file for authentication.
3. **RBAC**: The agent needs specific permissions to monitor and heal resources.

## 🔌 Connection Modes

Sentinel attempts to connect in the following order:

1. **In-Cluster**: If running as a pod inside Kubernetes (checks `KUBERNETES_SERVICE_HOST`).
2. **Environment Variable**: Checks `KUBECONFIG` env var for the config file path.
3. **Default Location**: Looks for config at `~/.kube/config` (or `%USERPROFILE%\.kube\config` on Windows).

## 🛡️ RBAC Configuration

To give Sentinel permissions to monitor and heal (delete pods, scale deployments), apply the following RBAC manifest:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sentinel-agent
  namespace: sentinel
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sentinel-monitor
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "events", "namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "events"]
    verbs: ["delete"]  # For pod healing
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sentinel-monitor-binding
subjects:
  - kind: ServiceAccount
    name: sentinel-agent
    namespace: sentinel
roleRef:
  kind: ClusterRole
  name: sentinel-monitor
  apiGroup: rbac.authorization.k8s.io
```

## 📊 Dashboard Features

The new Kubernetes Dashboard at `/dashboard/kubernetes` provides:

- **Cluster Health Score**: Aggregated health metric based on pod readiness.
- **Deployment Status**: Visual progress bars for rollout status.
- **Pod Grid**: Real-time status of all pods with quick delete actions.
- **Event Stream**: Live feed of cluster events (warnings/errors).
- **Actions**:
  - **Scale**: Update replica counts for deployments.
  - **Restart**: Trigger rolling restarts.
  - **Rollback**: Revert to previous deployment revision.
  - **Delete Pod**: Force delete unhealthy pods to trigger recreation.

## ⚠️ Troubleshooting

**"Failed to connect" or "ECONNREFUSED"**:
- Ensure your cluster is running (`kubectl cluster-info`).
- If running Sentinel in Docker Desktop, it handles kubeconfig automatically if mounted, but for `host.docker.internal` networking, ensure your kubeconfig uses the correct server address.

**Permission Denied**:
- Verify the RBAC roles are applied correctly.
- Check if the service account token is mounted if running in-cluster.
