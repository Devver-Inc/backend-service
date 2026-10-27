import { Injectable } from '@nestjs/common';
import { dump } from 'js-yaml';
import { MachineConfiguration } from '../project.types';
import { DEFAULT_STORAGE_CLASS } from './deployment.constants';

export interface AgentValuesConfig {
  previewDomain: string;
  sshHost: string;
  backendUrl: string;
}

/**
 * Non-secret values only. DEVVER_SECRET and the connection strings come from
 * Vault (vaultPaths.agent) through the chart's ExternalSecret.
 */
@Injectable()
export class ProjectValuesYamlGenerator {
  generateAppValues(
    project: {
      id: string;
      name: string;
      machineConfiguration: MachineConfiguration;
    },
    organization: { id: string; name: string },
    config: AgentValuesConfig,
  ): string {
    const memory = `${Math.round(project.machineConfiguration.ram * 1024)}Mi`;
    const cpu = `${Math.round(project.machineConfiguration.cpuCores * 1000)}m`;

    return dump({
      organization: {
        id: organization.id,
        name: organization.name,
        domain: 'devver.app',
      },
      project: { id: project.id, name: project.name },
      imagePullSecrets: [{ name: 'ghcr-secret' }],
      container: {
        image: 'ghcr.io/devver-inc/deploy-agent:latest',
        port: 80,
        type: 'app',
        command: [],
        args: [],
        env: {
          DEVVER_PROJECT_ID: project.id,
          DEVVER_ORGANIZATION_ID: organization.id,
          DEVVER_PREVIEW_DOMAIN: config.previewDomain,
          DEVVER_WIDGET_URL:
            'https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@dev/public/devver-overlay.iife.js', // TODO: change to main when ready
          DEVVER_GIT_SSH_HOST: config.sshHost,
          DEVVER_BACKEND_URL: config.backendUrl,
        },
      },
      resources: {
        requests: { memory, cpu },
        limits: { memory: '2Gi', cpu: '2000m' },
      },
      persistence: {
        enabled: true,
        app: {
          size: '5Gi',
          mountPath: '/app',
          storageClass: DEFAULT_STORAGE_CLASS,
        },
        root: {
          size: '5Gi',
          mountPath: '/root',
          storageClass: DEFAULT_STORAGE_CLASS,
        },
      },
      replicaCount: 1,
      ports: { http: 80, https: 443 },
      labels: {},
      annotations: {},
    });
  }
}
