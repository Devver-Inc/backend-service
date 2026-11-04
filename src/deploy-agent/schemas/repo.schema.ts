import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PrepareReport, RepoServices } from '../_utils/types/deployment.types';

export type DeployRepoDocument = HydratedDocument<DeployRepo>;

@Schema({ timestamps: true })
export class DeployRepo {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  name: string;

  /** Same in every clone of the code: what `init` matches an existing repo on. */
  @Prop({ required: true })
  rootCommit: string;

  @Prop({ required: true })
  displayName: string;

  @Prop()
  install?: string;

  @Prop({ type: Object })
  services?: RepoServices;

  /** Last dependency preparation the agent reported for this repo. */
  @Prop({ type: Object })
  lastPrepare?: PrepareReport;

  createdAt: Date;
  updatedAt: Date;
}

export const DeployRepoSchema = SchemaFactory.createForClass(DeployRepo);

DeployRepoSchema.index({ organizationId: 1 });
DeployRepoSchema.index({ projectId: 1, name: 1 }, { unique: true });
DeployRepoSchema.index({ projectId: 1, rootCommit: 1 }, { unique: true });
