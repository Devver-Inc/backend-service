import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ServiceName, Services } from '../_utils/types/agent.types';
import { DeploymentRecordStatus } from '../_utils/types/deployment.types';
import { DatabaseLink } from 'src/projects/project.types';

export type DeploymentDocument = HydratedDocument<Deployment>;

/**
 * One immutable deployment of one commit. Only `ready` ones are replayed by
 * the agent at boot; the env lives in Vault under
 * vaultPaths.deployment(projectId, deploymentId).
 */
@Schema({ timestamps: true })
export class Deployment {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  repo: string;

  @Prop({ required: true })
  commit: string;

  @Prop({ type: String, default: null })
  parentDeploymentId: string | null;

  @Prop({ type: String, default: null })
  secondParentDeploymentId: string | null;

  @Prop({
    type: String,
    required: true,
    enum: ['preparing', 'ready', 'failed'],
  })
  status: DeploymentRecordStatus;

  @Prop({ type: String, default: null })
  stage: string | null;

  @Prop({ type: String, default: null })
  displayName: string | null;

  @Prop({ type: String, required: true, enum: ['web', 'api'] })
  serviceName: ServiceName;

  @Prop({ required: true })
  deploymentId: string;

  @Prop({ required: true })
  host: string;

  @Prop({ type: Object, required: true })
  service: Services;

  @Prop({ type: [Object] })
  dbLinks?: DatabaseLink[];

  /** Git branch it was deployed from; its latest deployment of a service owns the branch URL. */
  @Prop({ type: String, default: null })
  branch: string | null;

  /** Last deploy, amend or in-place redeploy (a rename does not count). */
  @Prop({ type: Date, default: Date.now })
  deployedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);

DeploymentSchema.index({ organizationId: 1 });
DeploymentSchema.index({ projectId: 1, repo: 1, status: 1 });
DeploymentSchema.index({ projectId: 1, deploymentId: 1 }, { unique: true });
