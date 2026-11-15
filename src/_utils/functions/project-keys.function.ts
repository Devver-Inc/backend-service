import { createHmac } from 'node:crypto';

/** Namespace, Argo app name and manifest folder of a project: stable across renames. */
export const projectNamespace = (projectId: string): string => `p-${projectId}`;

export const agentUrl = (projectId: string): string =>
  `http://deploy-agent.${projectNamespace(projectId)}.svc.cluster.local:8080`;

/** Per-project agent token (DEVVER_SECRET), derived so the backend never has to look it up. */
export const agentToken = (masterSecret: string, projectId: string): string =>
  createHmac('sha256', masterSecret).update(projectId).digest('hex');

// Relative to kubernetes-cluster/<org>/<env>/ (infra convention). app is synced by
// ESO into the agent pod; deployments/* is read only by the backend.
export const vaultPaths = {
  agent: (projectId: string) => `clients/${projectNamespace(projectId)}/app`,
  mongo: (projectId: string) => `clients/${projectNamespace(projectId)}/mongo`,
  deployment: (projectId: string, deploymentId: string) =>
    `clients/${projectNamespace(projectId)}/deployments/${deploymentId}`,
};
