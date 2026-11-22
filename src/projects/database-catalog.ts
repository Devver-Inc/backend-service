import { DatabaseSize, DatabaseType } from './project.types';

export interface DatabaseSizeSpec {
  /** CPU limit; the request is a quarter of it. */
  cpuMillis: number;
  /** Request and limit: a database is never evicted for memory on a busy node. */
  memory: string;
  disk: string;
  settings: Record<string, string>;
}

interface EngineCatalog {
  image: string;
  default: string;
  versions: Record<string, { tag: string; deprecated?: boolean }>;
  sizes: Record<DatabaseSize, DatabaseSizeSpec>;
}

/**
 * Add a version: one entry. Stop offering one: `deprecated: true` or delete
 * the entry; databases already on it keep their image tag and keep running.
 */
export const DATABASE_CATALOG: Record<DatabaseType, EngineCatalog> = {
  [DatabaseType.MONGO]: {
    image: 'mongo',
    default: '8.0',
    versions: { '8.0': { tag: '8.0' }, '7.0': { tag: '7.0' } },
    sizes: {
      s: {
        cpuMillis: 1000,
        memory: '1536Mi',
        disk: '5Gi',
        settings: { wiredTigerCacheSizeGB: '0.5' },
      },
      m: {
        cpuMillis: 2000,
        memory: '3Gi',
        disk: '20Gi',
        settings: { wiredTigerCacheSizeGB: '1' },
      },
      l: {
        cpuMillis: 4000,
        memory: '6Gi',
        disk: '50Gi',
        settings: { wiredTigerCacheSizeGB: '2.5' },
      },
    },
  },
  [DatabaseType.POSTGRES]: {
    image: 'postgres',
    default: '18',
    versions: {
      '18': { tag: '18-alpine' },
      '17': { tag: '17-alpine' },
      '16': { tag: '16-alpine' },
    },
    sizes: {
      s: {
        cpuMillis: 1000,
        memory: '1536Mi',
        disk: '5Gi',
        settings: {
          shared_buffers: '256MB',
          max_connections: '100',
          max_wal_size: '512MB',
          shm: '256Mi',
        },
      },
      m: {
        cpuMillis: 2000,
        memory: '3Gi',
        disk: '20Gi',
        settings: {
          shared_buffers: '768MB',
          max_connections: '150',
          max_wal_size: '1GB',
          shm: '512Mi',
        },
      },
      l: {
        cpuMillis: 4000,
        memory: '6Gi',
        disk: '50Gi',
        settings: {
          shared_buffers: '1536MB',
          max_connections: '200',
          max_wal_size: '2GB',
          shm: '1Gi',
        },
      },
    },
  },
  [DatabaseType.VALKEY]: {
    image: 'valkey/valkey',
    default: '9.0',
    versions: { '9.0': { tag: '9.0-alpine' }, '8.1': { tag: '8.1-alpine' } },
    // maxmemory at 75% of the limit: headroom for the AOF rewrite fork.
    sizes: {
      s: {
        cpuMillis: 500,
        memory: '512Mi',
        disk: '2Gi',
        settings: { maxmemory: '384mb' },
      },
      m: {
        cpuMillis: 1000,
        memory: '1Gi',
        disk: '5Gi',
        settings: { maxmemory: '768mb' },
      },
      l: {
        cpuMillis: 2000,
        memory: '2Gi',
        disk: '10Gi',
        settings: { maxmemory: '1536mb' },
      },
    },
  },
};

export const DEFAULT_DATABASE_SIZE = DatabaseSize.S;

export const isOfferedVersion = (
  type: DatabaseType,
  version: string,
): boolean => {
  const entry = DATABASE_CATALOG[type].versions[version];
  return !!entry && !entry.deprecated;
};

export const isDeprecatedVersion = (
  type: DatabaseType,
  version: string,
): boolean => !isOfferedVersion(type, version);
