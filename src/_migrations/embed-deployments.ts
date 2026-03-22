/**
 * One-shot migration: embed deployments collection into Project.deploymentConfig
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register src/_migrations/embed-deployments.ts
 *
 * The `deployments` collection is kept as a backup and NOT dropped.
 */
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const DEPLOYMENT_STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  deployed: 'deployed',
  failed: 'failed',
};

async function main() {
  const uri = process.env.DATABASE_URL ?? process.env.MONGODB_URI;
  const dbName = process.env.DATABASE_NAME;

  if (!uri) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(uri, { dbName });

  const db = mongoose.connection.db!;
  const deploymentsCollection = db.collection('deployments');
  const projectsCollection = db.collection('projects');

  const deployments = await deploymentsCollection.find({}).toArray();
  console.log(`Found ${deployments.length} deployment(s) to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const dep of deployments) {
    const projectId = dep.project;

    if (!projectId) {
      console.warn(`Deployment ${dep._id} has no project reference, skipping`);
      skipped++;
      continue;
    }

    const deploymentConfig = {
      container: dep.container ?? {},
      resources: dep.resources ?? {
        requests: { memory: '128Mi', cpu: '100m' },
        limits: { memory: '128Mi', cpu: '100m' },
      },
      persistence: dep.persistence ?? { enabled: false },
      replicaCount: dep.replicaCount ?? 1,
      ports: dep.ports ?? { http: 80, https: 443 },
      labels: dep.labels ?? {},
      annotations: dep.annotations ?? {},
      organizationDomain: dep.organizationDomain ?? 'devver.app',
      githubPath: dep.githubPath ?? '',
      status: DEPLOYMENT_STATUS_MAP[dep.status] ?? 'pending',
    };

    const result = await projectsCollection.findOneAndUpdate(
      { _id: projectId },
      { $set: { deploymentConfig } },
    );

    if (!result) {
      console.warn(
        `Project ${projectId} not found for deployment ${dep._id}, skipping`,
      );
      skipped++;
    } else {
      console.log(`Migrated deployment ${dep._id} -> project ${projectId}`);
      migrated++;
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped`);
  console.log('The `deployments` collection has been kept as backup.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
