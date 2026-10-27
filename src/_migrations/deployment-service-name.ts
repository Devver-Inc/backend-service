/**
 * One-shot migration: web and api of the same branch become separate deployments.
 * Backfills `serviceName` and drops the old { projectId, repo, branch } unique index.
 *
 * Run before deploying the new backend:
 *   npx ts-node -r tsconfig-paths/register src/_migrations/deployment-service-name.ts
 */
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const uri = process.env.DATABASE_URL ?? process.env.MONGODB_URI;
  if (!uri) throw new Error('DATABASE_URL environment variable is not set');

  await mongoose.connect(uri, { dbName: process.env.DATABASE_NAME });
  const deployments = mongoose.connection.db!.collection('deployments');
  const agentDeployments = {
    deploymentId: { $exists: true },
    serviceName: { $exists: false },
  };

  const api = await deployments.updateMany(
    { ...agentDeployments, 'service.api': { $exists: true } },
    { $set: { serviceName: 'api' } },
  );
  const web = await deployments.updateMany(agentDeployments, {
    $set: { serviceName: 'web' },
  });
  console.log(
    `serviceName set: ${web.modifiedCount} web, ${api.modifiedCount} api`,
  );

  const oldIndex = 'projectId_1_repo_1_branch_1';
  if (await deployments.indexExists(oldIndex)) {
    await deployments.dropIndex(oldIndex);
    console.log(`Dropped index ${oldIndex}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
