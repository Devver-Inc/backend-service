import { Injectable } from '@nestjs/common';
import { dump } from 'js-yaml';
import { toSlug } from 'src/_utils/functions/to-slug.function';
import { DEFAULT_STORAGE_CLASS } from '../deployment.constants';

@Injectable()
export class MongoDbProvider {
  buildConnectionString(
    organizationName: string,
    projectName: string,
    rootUsername: string,
    rootPassword: string,
    targetDatabase = 'admin',
  ): string {
    const orgName = toSlug(organizationName);
    const projName = toSlug(projectName);
    const username = encodeURIComponent(rootUsername);
    const password = encodeURIComponent(rootPassword);
    const host = `${orgName}-${projName}-mongo`;
    const database = encodeURIComponent(targetDatabase);

    return `mongodb://${username}:${password}@${host}:27017/${database}?authSource=admin&tls=true&tlsAllowInvalidCertificates=true`;
  }

  generateValuesYaml(
    organizationName: string,
    projectName: string,
    config: {
      rootUsername: string;
      rootPassword: string;
      replicaCount: number;
      ram: number;
      cpuCores: number;
      storage: number;
    },
  ): string {
    const orgName = toSlug(organizationName);
    const projName = toSlug(projectName);
    const memory = `${Math.round(config.ram * 1024)}Mi`;
    const cpu = `${Math.round(config.cpuCores * 1000)}m`;
    const storage = `${config.storage}Gi`;

    return dump({
      namespace: { create: false },
      organization: { name: orgName, domain: 'devver.app' },
      project: { name: projName },
      auth: {
        rootUsername: config.rootUsername,
        rootPassword: config.rootPassword, // TODO: replace with Vault reference
      },
      replicaCount: config.replicaCount,
      persistence: { size: storage, storageClass: DEFAULT_STORAGE_CLASS },
      resources: {
        requests: { memory, cpu },
        limits: { memory: '1Gi', cpu: '500m' },
      },
    });
  }
}
