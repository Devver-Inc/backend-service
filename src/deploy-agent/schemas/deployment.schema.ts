import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Services } from '../_utils/types/agent.types';
import { AgentDeploymentStatus } from '../_utils/types/deployment.types';

export type { Services };
export { AgentDeploymentStatus };

export type DeploymentDocument = HydratedDocument<Deployment>;

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

  @Prop({ required: true })
  deploymentId: string;

  @Prop()
  commit?: string;

  @Prop()
  argoAppName?: string;

  @Prop({ type: Object, required: true })
  service: Services;

  @Prop({ type: Object })
  links?: Record<string, Record<string, string>>;

  @Prop({ type: Object })
  env?: Record<string, string>;

  @Prop({
    type: String,
    enum: AgentDeploymentStatus,
  })
  status: AgentDeploymentStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);

DeploymentSchema.index({ projectId: 1 });
DeploymentSchema.index({ projectId: 1, repo: 1, branch: 1 }, { unique: true });
