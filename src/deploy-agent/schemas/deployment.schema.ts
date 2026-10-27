import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ServiceName, Services } from '../_utils/types/agent.types';
import { DatabaseLink } from 'src/projects/project.types';

export type DeploymentDocument = HydratedDocument<Deployment>;

/**
 * Desired state: one document per deployment the project's agent should run.
 * The env lives in Vault under vaultPaths.deployment(projectId, deploymentId).
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
  branch: string;

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

  createdAt: Date;
  updatedAt: Date;
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);

DeploymentSchema.index({ organizationId: 1 });
DeploymentSchema.index({ projectId: 1, deploymentId: 1 }, { unique: true });
