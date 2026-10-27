import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ServiceName, Services } from '../_utils/types/agent.types';
import { AgentDeploymentStatus } from '../_utils/types/deployment.types';
import { DatabaseLink } from 'src/projects/project.types';

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

  @Prop({ type: String, required: true, enum: ['web', 'api'] })
  serviceName: ServiceName;

  @Prop({ required: true })
  deploymentId: string;

  @Prop()
  commit?: string;

  @Prop()
  argoAppName?: string;

  @Prop({ type: Object, required: true })
  service: Services;

  @Prop({ type: [Object] })
  dbLinks?: DatabaseLink[];

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
// Requires src/_migrations/deployment-service-name.ts (drops the old unique index).
DeploymentSchema.index(
  { projectId: 1, repo: 1, branch: 1, serviceName: 1 },
  { unique: true },
);
