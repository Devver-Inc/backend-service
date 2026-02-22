import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeployRepoDocument = HydratedDocument<DeployRepo>;

@Schema({ timestamps: true })
export class DeployRepo {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  pushUrl: string;

  createdAt: Date;
  updatedAt: Date;
}

export const DeployRepoSchema = SchemaFactory.createForClass(DeployRepo);

DeployRepoSchema.index({ projectId: 1 });
DeployRepoSchema.index({ projectId: 1, name: 1 }, { unique: true });
