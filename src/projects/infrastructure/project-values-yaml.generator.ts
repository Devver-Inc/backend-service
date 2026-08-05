import { Injectable } from '@nestjs/common';
import { dump } from 'js-yaml';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import {
  DATABASE_CONNECTION_ENV,
  DatabaseType,
  MachineConfiguration,
} from '../project.types';
import { DEFAULT_STORAGE_CLASS } from './deployment.constants';

@Injectable()
export class ProjectValuesYamlGenerator {
  generateAppValues(
    organizationName: string,
    projectName: string,
    machineConfig: MachineConfiguration,
    devverSecret: string,
    projectId: string,
    gitAuthUrl: string,
    databaseConnectionStrings?: Partial<Record<DatabaseType, string>>,
  ): string {
    const orgName = toSlug(organizationName);
    const projName = toSlug(projectName);
    const memory = `${Math.round(machineConfig.ram * 1024)}Mi`;
    const cpu = `${Math.round(machineConfig.cpuCores * 1000)}m`;
    const databaseEnv = Object.fromEntries(
      Object.entries(DATABASE_CONNECTION_ENV).flatMap(([type, envKey]) => {
        const connectionString =
          databaseConnectionStrings?.[type as DatabaseType];
        return connectionString ? [[envKey, connectionString]] : [];
      }),
    );

    return dump({
      organization: { name: orgName, domain: 'devver.app' },
      project: { name: projName },
      imagePullSecrets: [{ name: 'ghcr-secret' }],
      container: {
        image: 'ghcr.io/devver-inc/deploy-agent:latest',
        port: 80,
        type: 'app',
        command: [],
        args: [],
        env: {
          DEVVER_SECRET: devverSecret, // TODO: replace with Vault reference
          DEVVER_PROJECT_ID: projectId,
          DEVVER_GIT_AUTH_URL: gitAuthUrl,
          DEVVER_WIDGET_URL:
            'https://cdn.jsdelivr.net/gh/Devver-Inc/overlay@dev/public/devver-overlay.iife.js', // TODO: change to main when ready
          ...databaseEnv,
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
