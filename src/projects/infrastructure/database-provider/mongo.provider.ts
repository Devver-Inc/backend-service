import { Injectable } from '@nestjs/common';
import { dump } from 'js-yaml';
import { projectNamespace } from 'src/_utils/functions/project-keys.function';
import { DEFAULT_STORAGE_CLASS } from '../deployment.constants';

@Injectable()
export class MongoDbProvider {
  buildConnectionString(
    projectId: string,
    rootUsername: string,
    rootPassword: string,
    targetDatabase = 'admin',
  ): string {
    const username = encodeURIComponent(rootUsername);
    const password = encodeURIComponent(rootPassword);
    const host = `${projectNamespace(projectId)}-mongo`;
    const database = encodeURIComponent(targetDatabase);

    return `mongodb://${username}:${password}@${host}:27017/${database}?authSource=admin&tls=true&tlsAllowInvalidCertificates=true`;
  }

  generateValuesYaml(
    project: { id: string; name: string },
    config: {
      replicaCount: number;
      ram: number;
      cpuCores: number;
      storage: number;
    },
  ): string {
    const memory = `${Math.round(config.ram * 1024)}Mi`;
    const cpu = `${Math.round(config.cpuCores * 1000)}m`;
    const storage = `${config.storage}Gi`;

    return dump({
      namespace: { create: false },
      project: { id: project.id, name: project.name },
      replicaCount: config.replicaCount,
      persistence: { size: storage, storageClass: DEFAULT_STORAGE_CLASS },
      resources: {
        requests: { memory, cpu },
        limits: { memory: '1Gi', cpu: '500m' },
      },
    });
  }
}
