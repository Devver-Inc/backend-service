import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

export enum DeploymentStatus {
  PENDING = 'pending',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
}

@Schema({ _id: false })
export class MachineConfiguration {
  @Prop({ required: true, min: 1, max: 16, default: 2 })
  cpuCores: number;

  @Prop({ required: true, min: 1, max: 64, default: 4 })
  ram: number;

  @Prop({ required: true, min: 10, max: 500, default: 20 })
  storage: number;
}

export const MachineConfigurationSchema =
  SchemaFactory.createForClass(MachineConfiguration);

@Schema({ _id: false })
export class AccessControl {
  @Prop({ required: true, default: true })
  requireEmailAuth: boolean;

  @Prop({ required: true, default: false })
  publicAccess: boolean;

  @Prop({ required: true, default: false })
  restrictToTeamMembers: boolean;
}

export const AccessControlSchema = SchemaFactory.createForClass(AccessControl);

// --- DeploymentConfig nested schemas ---

@Schema({ _id: false })
export class ContainerConfig {
  @Prop({ type: String, required: true })
  image: string;

  @Prop({ type: Number, required: true })
  port: number;

  @Prop({ type: String, enum: ['app', 'os'], required: true })
  type: 'app' | 'os';

  @Prop({ type: [String], default: [] })
  command: string[];

  @Prop({ type: [String], default: [] })
  args: string[];
}

export const ContainerConfigSchema =
  SchemaFactory.createForClass(ContainerConfig);

@Schema({ _id: false })
export class ResourceSpec {
  @Prop({ type: String, required: true })
  memory: string;

  @Prop({ type: String, required: true })
  cpu: string;
}

export const ResourceSpecSchema = SchemaFactory.createForClass(ResourceSpec);

@Schema({ _id: false })
export class ResourcesConfig {
  @Prop({ type: ResourceSpecSchema, required: true })
  requests: ResourceSpec;

  @Prop({ type: ResourceSpecSchema, required: true })
  limits: ResourceSpec;
}

export const ResourcesConfigSchema =
  SchemaFactory.createForClass(ResourcesConfig);

@Schema({ _id: false })
export class PersistenceVolume {
  @Prop({ type: String })
  size: string;

  @Prop({ type: String })
  mountPath: string;

  @Prop({ type: String })
  storageClass: string;
}

export const PersistenceVolumeSchema =
  SchemaFactory.createForClass(PersistenceVolume);

@Schema({ _id: false })
export class PersistenceConfig {
  @Prop({ type: Boolean, default: false })
  enabled: boolean;

  @Prop({ type: PersistenceVolumeSchema, required: false })
  app?: PersistenceVolume;

  @Prop({ type: PersistenceVolumeSchema, required: false })
  root?: PersistenceVolume;
}

export const PersistenceConfigSchema =
  SchemaFactory.createForClass(PersistenceConfig);

@Schema({ _id: false })
export class PortsConfig {
  @Prop({ type: Number, default: 80 })
  http: number;

  @Prop({ type: Number, default: 443 })
  https: number;
}

export const PortsConfigSchema = SchemaFactory.createForClass(PortsConfig);

@Schema({ _id: false })
export class DeploymentConfig {
  @Prop({ type: ContainerConfigSchema, required: true })
  container: ContainerConfig;

  @Prop({ type: ResourcesConfigSchema, required: true })
  resources: ResourcesConfig;

  @Prop({ type: PersistenceConfigSchema, required: true })
  persistence: PersistenceConfig;

  @Prop({ type: Number, default: 1 })
  replicaCount: number;

  @Prop({ type: PortsConfigSchema, required: true })
  ports: PortsConfig;

  @Prop({ type: Map, of: String, default: {} })
  labels: Map<string, string>;

  @Prop({ type: Map, of: String, default: {} })
  annotations: Map<string, string>;

  @Prop({ type: String, default: 'devver.app' })
  organizationDomain: string;

  @Prop({ type: String, required: true })
  githubPath: string;

  @Prop({
    type: String,
    enum: Object.values(DeploymentStatus),
    default: DeploymentStatus.PENDING,
  })
  status: DeploymentStatus;
}

export const DeploymentConfigSchema =
  SchemaFactory.createForClass(DeploymentConfig);

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

  @Prop({ type: AccessControlSchema, required: true })
  accessControl: AccessControl;

  @Prop({ type: DeploymentConfigSchema, required: false })
  deploymentConfig?: DeploymentConfig;

  createdAt: Date;
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ organizationId: 1 });
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ organizationId: 1, createdAt: -1 });
