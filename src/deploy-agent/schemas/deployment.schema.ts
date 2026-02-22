import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ServiceConfig } from '../_utils/types/agent.types';
import { DeploymentStatus } from '../_utils/types/deployment.types';

export type { ServiceConfig };
export { DeploymentStatus };

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

  @Prop()
  commit?: string;

  @Prop({ type: Object, required: true })
  services: Record<string, ServiceConfig>;

  @Prop({ type: Object })
  links?: Record<string, Record<string, string>>;

  @Prop({ type: Object })
  env?: Record<string, Record<string, string>>;

  @Prop({
    type: String,
    enum: DeploymentStatus,
  })
  status: DeploymentStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);

DeploymentSchema.index({ projectId: 1 });
DeploymentSchema.index({ projectId: 1, repo: 1, branch: 1 }, { unique: true });
