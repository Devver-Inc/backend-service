import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

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

  createdAt: Date;
  updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
