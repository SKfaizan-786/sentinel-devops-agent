const client = require('./client');

async function deletePod(namespace, podName) {
  if (!client.initialized) await client.init();
  // Force delete will cause K8s to recreate the pod
  try {
      await client.coreApi.deleteNamespacedPod(podName, namespace, undefined, undefined, 0);
      return { action: 'delete', pod: podName, namespace, success: true };
  } catch (error) {
      console.error(`Failed to delete pod ${podName}:`, error.message);
      throw error;
  }
}

async function scaleDeployment(namespace, deploymentName, replicas) {
  if (!client.initialized) await client.init();
  const count = parseInt(replicas);
  if (isNaN(count) || count < 0) {
      throw new Error(`Invalid replica count: ${replicas}`);
  }

  const patch = [{ op: 'replace', path: '/spec/replicas', value: count }];
  try {
      await client.appsApi.patchNamespacedDeploymentScale(
        deploymentName,
        namespace,
        patch,
        undefined, undefined, undefined, undefined,
        { headers: { 'Content-Type': 'application/json-patch+json' } }
      );
      return { action: 'scale', deployment: deploymentName, replicas, success: true };
  } catch (error) {
      console.error(`Failed to scale deployment ${deploymentName}:`, error.message);
      throw error;
  }
}

async function rollbackDeployment(namespace, deploymentName) {
  if (!client.initialized) await client.init();
  try {
      // Get current deployment
      // const dep = await client.appsApi.readNamespacedDeployment(deploymentName, namespace);
      
      // Get revision history
      const rs = await client.appsApi.listNamespacedReplicaSet(namespace, undefined, undefined, undefined, undefined, `app=${deploymentName}`);
      
      // Find previous revision
      const sorted = rs.body.items.sort((a, b) => 
        (b.metadata.annotations?.['deployment.kubernetes.io/revision'] || 0) -
        (a.metadata.annotations?.['deployment.kubernetes.io/revision'] || 0)
      );
      
      if (sorted.length < 2) {
        throw new Error('No previous revision to rollback to');
      }
      
      const previousRevision = sorted[1].spec.template;
      
      // Patch deployment with previous template
      // Note: A true rollback usually involves `kubectl rollout undo` which talks to the rollout API or updates the Deployment spec to match the previous ReplicaSet's pod template.
      // Resetting the pod template to the previous one effectively rolls back.
      
      const patch = { spec: { template: previousRevision } };
      await client.appsApi.patchNamespacedDeployment(
        deploymentName, namespace, patch,
        undefined, undefined, undefined, undefined,
        { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
      );
      
      return { action: 'rollback', deployment: deploymentName, success: true };
  } catch (error) {
      console.error(`Failed to rollback deployment ${deploymentName}:`, error.message);
      throw error;
  }
}

async function restartDeployment(namespace, deploymentName) {
  if (!client.initialized) await client.init();
  // Trigger rolling restart by updating annotation
  const patch = {
    spec: {
      template: {
        metadata: {
          annotations: {
            'sentinel.io/restartedAt': new Date().toISOString()
          }
        }
      }
    }
  };
  
  try {
      await client.appsApi.patchNamespacedDeployment(
        deploymentName, namespace, patch,
        undefined, undefined, undefined, undefined,
        { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
      );
      
      return { action: 'restart', deployment: deploymentName, success: true };
  } catch (error) {
      console.error(`Failed to restart deployment ${deploymentName}:`, error.message);
      throw error;
  }
}

module.exports = { deletePod, scaleDeployment, rollbackDeployment, restartDeployment };
