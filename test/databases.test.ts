// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from 'js-yaml';
import {
  DATABASE_CATALOG,
  isDeprecatedVersion,
  isOfferedVersion,
} from 'src/projects/database-catalog';
import {
  connectionString,
  databaseCredentials,
  databaseValuesYaml,
  isValidDatabaseName,
} from 'src/projects/infrastructure/database-engines';
import { ProjectDomain } from 'src/projects/project.domain';
import { DatabaseSize, DatabaseType } from 'src/projects/project.types';

const PROJECT_ID = '6650a1b2c3d4e5f6a7b8c9d0';
const HOST = `p-${PROJECT_ID}`;

type Values = {
  name: string;
  image: { repository: string; tag: string };
  command?: string[];
  args?: string[];
  postStart?: string[];
  env?: Record<string, string>;
  secretEnv: { vaultKey: string };
  volume: { path: string; size: string };
  shm?: { sizeLimit: string };
  resources: {
    requests: { cpu: string; memory: string };
    limits: { cpu: string; memory: string };
  };
};
const values = (...args: Parameters<typeof databaseValuesYaml>) =>
  load(databaseValuesYaml(...args)) as Values;

test('a database without version or size gets the catalog default, size S and its disk', () => {
  const database = ProjectDomain.database({ type: DatabaseType.POSTGRES });
  assert.equal(database.version, DATABASE_CATALOG.postgres.default);
  assert.equal(database.size, DatabaseSize.S);
  assert.equal(database.disk, '5Gi');
});

test('a deprecated version is no longer offered but is flagged, not refused, on existing databases', () => {
  const versions = DATABASE_CATALOG.postgres.versions;
  assert.equal(isOfferedVersion(DatabaseType.POSTGRES, '17'), true);
  versions['17'] = { ...versions['17'], deprecated: true };
  try {
    assert.equal(isOfferedVersion(DatabaseType.POSTGRES, '17'), false);
    assert.equal(isDeprecatedVersion(DatabaseType.POSTGRES, '17'), true);
  } finally {
    delete versions['17'].deprecated;
  }
  assert.equal(isOfferedVersion(DatabaseType.POSTGRES, '9.6'), false);
});

test('a bigger size changes CPU, memory and tuning, never the disk chosen at creation', () => {
  const created = ProjectDomain.database({ type: DatabaseType.POSTGRES });
  const v = values(PROJECT_ID, { ...created, size: DatabaseSize.M });
  assert.equal(v.volume.size, '5Gi');
  assert.deepEqual(v.resources, {
    requests: { cpu: '500m', memory: '3Gi' },
    limits: { cpu: '2000m', memory: '3Gi' },
  });
  assert.ok(v.args?.includes('shared_buffers=768MB'));
  assert.ok(v.args?.includes('max_connections=150'));
  assert.equal(v.shm?.sizeLimit, '512Mi');
});

test('each engine runs its pinned tag with its secret env from Vault', () => {
  const mongo = values(
    PROJECT_ID,
    ProjectDomain.database({ type: DatabaseType.MONGO }),
  );
  assert.equal(mongo.name, `${HOST}-mongo`);
  assert.deepEqual(mongo.image, { repository: 'mongo', tag: '8.0' });
  assert.equal(mongo.secretEnv.vaultKey, 'mongo');
  assert.match(
    mongo.command!.join(' '),
    /--replSet rs0 .*--oplogSize 128 --wiredTigerCacheSizeGB 0\.5$/,
  );
  assert.match(mongo.postStart!.join(' '), /rs\.initiate/);
  assert.doesNotMatch(mongo.postStart!.join(' '), / -p /);
  assert.equal(mongo.volume.path, '/data/db');

  const valkey = values(
    PROJECT_ID,
    ProjectDomain.database({ type: DatabaseType.VALKEY, version: '8.1' }),
  );
  assert.deepEqual(valkey.image, {
    repository: 'valkey/valkey',
    tag: '8.1-alpine',
  });
  const script = valkey.args!.join(' ');
  assert.doesNotMatch(script, /--requirepass/);
  assert.match(
    script,
    /valkey-server \/tmp\/valkey\.conf .*--maxmemory 384mb --maxmemory-policy noeviction$/,
  );
  assert.equal(valkey.command, undefined);
});

test('a database keeps its image tag after its version leaves the catalog', () => {
  const created = ProjectDomain.database({
    type: DatabaseType.POSTGRES,
    version: '16',
  });
  const versions = DATABASE_CATALOG.postgres.versions;
  const removed = versions['16'];
  delete versions['16'];
  try {
    assert.equal(isDeprecatedVersion(DatabaseType.POSTGRES, '16'), true);
    assert.equal(
      values(PROJECT_ID, { ...created, size: DatabaseSize.M }).image.tag,
      '16-alpine',
    );
  } finally {
    versions['16'] = removed;
  }
});

test('credentials are generated: hex passwords and a base64 Mongo keyfile', () => {
  const mongo = databaseCredentials(DatabaseType.MONGO);
  assert.match(mongo.MONGO_INITDB_ROOT_PASSWORD, /^[0-9a-f]{32}$/);
  assert.match(mongo.MONGO_KEYFILE, /^[A-Za-z0-9+/]{64}$/);
  assert.notEqual(
    databaseCredentials(DatabaseType.POSTGRES).POSTGRES_PASSWORD,
    databaseCredentials(DatabaseType.POSTGRES).POSTGRES_PASSWORD,
  );
});

test('connection strings point at the database Service, admin database by default', () => {
  const pg = { POSTGRES_USER: 'devver', POSTGRES_PASSWORD: 'abc' };
  assert.equal(
    connectionString(PROJECT_ID, DatabaseType.POSTGRES, pg),
    `postgresql://devver:abc@${HOST}-postgres:5432/postgres`,
  );
  assert.equal(
    connectionString(PROJECT_ID, DatabaseType.POSTGRES, pg, 'shop'),
    `postgresql://devver:abc@${HOST}-postgres:5432/shop`,
  );
  assert.equal(
    connectionString(
      PROJECT_ID,
      DatabaseType.MONGO,
      {
        MONGO_INITDB_ROOT_USERNAME: 'devver',
        MONGO_INITDB_ROOT_PASSWORD: 'abc',
      },
      'shop',
    ),
    `mongodb://devver:abc@${HOST}-mongo:27017/shop?authSource=admin&replicaSet=rs0`,
  );
  assert.equal(
    connectionString(
      PROJECT_ID,
      DatabaseType.VALKEY,
      { VALKEY_PASSWORD: 'abc' },
      '3',
    ),
    `redis://:abc@${HOST}-valkey:6379/3`,
  );
});

test('a dbLink names a database the engine accepts', () => {
  assert.equal(isValidDatabaseName(DatabaseType.POSTGRES, 'shop_db'), true);
  assert.equal(
    isValidDatabaseName(DatabaseType.POSTGRES, 'Shop"; DROP'),
    false,
  );
  assert.equal(isValidDatabaseName(DatabaseType.VALKEY, '15'), true);
  assert.equal(isValidDatabaseName(DatabaseType.VALKEY, '16'), false);
  assert.equal(isValidDatabaseName(DatabaseType.MONGO, 'my-app'), true);
  assert.equal(isValidDatabaseName(DatabaseType.MONGO, 'a.b'), false);
});
