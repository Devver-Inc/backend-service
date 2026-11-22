import { randomBytes } from 'node:crypto';
import { dump } from 'js-yaml';
import { projectNamespace } from 'src/_utils/functions/project-keys.function';
import { DATABASE_CATALOG, DatabaseSizeSpec } from '../database-catalog';
import { DatabaseDeploymentConfig, DatabaseType } from '../project.types';

const USER = 'devver';
// Hex: nothing to escape in a connection string, and the agent accepts only hex.
const newPassword = (): string => randomBytes(16).toString('hex');

export const databaseHost = (projectId: string, type: DatabaseType): string =>
  `${projectNamespace(projectId)}-${type}`;

interface Login {
  user: string;
  password: string;
}

interface Container {
  command?: string[];
  args?: string[];
  env?: Record<string, string>;
  postStart?: string[];
  volumePath: string;
  shm?: string;
}

interface Engine {
  port: number;
  /** Stored in Vault as is: the chart injects every key as the container's env. */
  credentials(): Record<string, string>;
  login(vault: Record<string, string>): Login;
  connectionString(host: string, login: Login, database: string): string;
  databasePattern: RegExp;
  adminDatabase: string;
  container(size: DatabaseSizeSpec): Container;
}

// Idempotent, rerun at every start; the entrypoint's temporary init server
// fails it until the root user exists, hence the loop.
const MONGO_INITIATE = [
  'for i in $(seq 1 60); do',
  // Credentials read from the env inside mongosh: on its argv, `ps` would show them.
  'mongosh --quiet --eval "db.getSiblingDB(\\"admin\\").auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD);',
  'try { rs.status().ok } catch (e) { rs.initiate({ _id: \\"rs0\\", members: [{ _id: 0, host: \\"$(hostname -f):27017\\" }] }).ok }"',
  '&& exit 0; sleep 2; done; exit 1',
].join(' ');

const ENGINES: Record<DatabaseType, Engine> = {
  [DatabaseType.MONGO]: {
    port: 27017,
    credentials: () => ({
      MONGO_INITDB_ROOT_USERNAME: USER,
      MONGO_INITDB_ROOT_PASSWORD: newPassword(),
      MONGO_KEYFILE: randomBytes(48).toString('base64'),
    }),
    login: (v) => ({
      user: v.MONGO_INITDB_ROOT_USERNAME,
      password: v.MONGO_INITDB_ROOT_PASSWORD,
    }),
    connectionString: (host, { user, password }, database) =>
      `mongodb://${user}:${password}@${host}:27017/${database}?authSource=admin&replicaSet=rs0`,
    databasePattern: /^[A-Za-z0-9_-]{1,63}$/,
    adminDatabase: 'admin',
    container: ({ settings }) => ({
      // A replica set with auth needs a keyfile, owned by mongod's uid.
      command: [
        'sh',
        '-c',
        'printf %s "$MONGO_KEYFILE" > /tmp/keyfile && chmod 400 /tmp/keyfile && chown 999:999 /tmp/keyfile' +
          ' && exec docker-entrypoint.sh mongod --replSet rs0 --keyFile /tmp/keyfile --bind_ip_all' +
          ` --oplogSize 128 --wiredTigerCacheSizeGB ${settings.wiredTigerCacheSizeGB}`,
      ],
      postStart: ['sh', '-c', MONGO_INITIATE],
      volumePath: '/data/db',
    }),
  },
  [DatabaseType.POSTGRES]: {
    port: 5432,
    credentials: () => ({
      POSTGRES_USER: USER,
      POSTGRES_PASSWORD: newPassword(),
    }),
    login: (v) => ({ user: v.POSTGRES_USER, password: v.POSTGRES_PASSWORD }),
    connectionString: (host, { user, password }, database) =>
      `postgresql://${user}:${password}@${host}:5432/${database}`,
    databasePattern: /^[a-z_][a-z0-9_]{0,62}$/,
    adminDatabase: 'postgres',
    container: ({ settings }) => ({
      args: [
        'postgres',
        ...['shared_buffers', 'max_connections', 'max_wal_size'].flatMap(
          (key) => ['-c', `${key}=${settings[key]}`],
        ),
      ],
      // A subfolder: one layout for every version, and no clash with the volume's root on NFS.
      env: {
        PGDATA: '/var/lib/postgresql/data/pgdata',
        POSTGRES_DB: 'postgres',
      },
      volumePath: '/var/lib/postgresql',
      shm: settings.shm,
    }),
  },
  [DatabaseType.VALKEY]: {
    port: 6379,
    credentials: () => ({ VALKEY_PASSWORD: newPassword() }),
    login: (v) => ({ user: '', password: v.VALKEY_PASSWORD }),
    connectionString: (host, { password }, database) =>
      `redis://:${password}@${host}:6379/${database}`,
    databasePattern: /^([0-9]|1[0-5])$/,
    adminDatabase: '0',
    container: ({ settings }) => ({
      // The password goes in a file, not on argv where `ps` shows it. `args`, not
      // `command`: the image's tini entrypoint stays.
      args: [
        'sh',
        '-c',
        'printf "requirepass %s\\n" "$VALKEY_PASSWORD" > /tmp/valkey.conf && chown 999 /tmp/valkey.conf && chmod 400 /tmp/valkey.conf' +
          ' && exec docker-entrypoint.sh valkey-server /tmp/valkey.conf --appendonly yes' +
          ` --maxmemory ${settings.maxmemory} --maxmemory-policy noeviction`,
      ],
      volumePath: '/data',
    }),
  },
};

export const databaseCredentials = (
  type: DatabaseType,
): Record<string, string> => ENGINES[type].credentials();

export const databasePort = (type: DatabaseType): number => ENGINES[type].port;

export const databaseLogin = (
  type: DatabaseType,
  vault: Record<string, string>,
): Login => ENGINES[type].login(vault);

export const isValidDatabaseName = (
  type: DatabaseType,
  database: string,
): boolean => ENGINES[type].databasePattern.test(database);

export const connectionString = (
  projectId: string,
  type: DatabaseType,
  vault: Record<string, string>,
  database = ENGINES[type].adminDatabase,
): string =>
  ENGINES[type].connectionString(
    databaseHost(projectId, type),
    ENGINES[type].login(vault),
    database,
  );

export const databaseValuesYaml = (
  projectId: string,
  config: Pick<DatabaseDeploymentConfig, 'type' | 'tag' | 'size' | 'disk'>,
): string => {
  const catalog = DATABASE_CATALOG[config.type];
  const size = catalog.sizes[config.size];
  const engine = ENGINES[config.type];
  const { volumePath, shm, ...container } = engine.container(size);
  return dump({
    project: { id: projectId },
    name: databaseHost(projectId, config.type),
    image: {
      repository: catalog.image,
      tag: config.tag,
    },
    ...container,
    ports: [{ name: config.type, port: engine.port }],
    secretEnv: { vaultKey: config.type },
    volume: { path: volumePath, size: config.disk },
    ...(shm && { shm: { sizeLimit: shm } }),
    resources: {
      requests: { cpu: `${size.cpuMillis / 4}m`, memory: size.memory },
      limits: { cpu: `${size.cpuMillis}m`, memory: size.memory },
    },
  });
};
