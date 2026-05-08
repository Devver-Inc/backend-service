import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

export enum ManifestStatus {
  PENDING = 'pending',
  PUSHED = 'pushed',
  FAILED = 'failed',
}

export enum OverlayCommentPermission {
  TEAM_ONLY = 'team_only',
  EMAIL_REQUIRED = 'email_required',
}

@Schema({ _id: false })
export class MachineConfiguration {
  @Prop({ required: true, min: 0.5, max: 2, default: 0.5 })
  cpuCores: number;

  @Prop({ required: true, min: 0.5, max: 2, default: 0.5 })
  ram: number;
}

export const MachineConfigurationSchema =
  SchemaFactory.createForClass(MachineConfiguration);

@Schema({ _id: false })
export class OverlayAccessControl {
  @Prop({
    type: String,
    enum: Object.values(OverlayCommentPermission),
    required: true,
  })
  commentPermission: OverlayCommentPermission;
}

export const OverlayAccessControlSchema =
  SchemaFactory.createForClass(OverlayAccessControl);

// --- DeploymentConfig nested schemas ---

@Schema({ _id: false })
export class DeploymentConfig {
  @Prop({ type: String, required: true })
  githubPath: string;

  @Prop({
    type: String,
    enum: Object.values(ManifestStatus),
    default: ManifestStatus.PENDING,
  })
  manifestStatus: ManifestStatus;
}

export const DeploymentConfigSchema =
  SchemaFactory.createForClass(DeploymentConfig);

@Schema({ _id: false })
export class MongoDeploymentConfig {
  @Prop({ type: Boolean, required: true, default: false })
  enabled: boolean;

  @Prop({ type: String, required: true })
  githubPath: string;

  @Prop({
    type: String,
    enum: Object.values(ManifestStatus),
    default: ManifestStatus.PENDING,
  })
  manifestStatus: ManifestStatus;

  @Prop({ required: true })
  rootUsername: string;

  @Prop({ required: true })
  rootPasswordEncrypted: string;

  @Prop({ required: true, min: 1, max: 3 })
  replicaCount: number;

  @Prop({ required: true, min: 0.5 })
  ram: number;

  @Prop({ required: true, min: 0.1 })
  cpuCores: number;

  @Prop({ required: true, min: 10, max: 500 })
  storage: number;
}

export const MongoDeploymentConfigSchema = SchemaFactory.createForClass(
  MongoDeploymentConfig,
);

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, minlength: 1, maxlength: 128 })
  name: string;

  @Prop({ maxlength: 256 })
  description?: string;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: MachineConfigurationSchema, required: true })
  machineConfiguration: MachineConfiguration;

  @Prop({ type: [String], default: [] })
  teamMemberIds: string[];

  @Prop({ type: OverlayAccessControlSchema, required: true })
  overlayAccessControl: OverlayAccessControl;

  @Prop({ type: DeploymentConfigSchema, required: false })
  deploymentConfig?: DeploymentConfig;

  @Prop({ type: MongoDeploymentConfigSchema, required: false })
  mongoConfiguration?: MongoDeploymentConfig;

  createdAt: Date;
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ organizationId: 1 });
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ organizationId: 1, createdAt: -1 });
ProjectSchema.index({ organizationId: 1, name: 1 }, { unique: true });
