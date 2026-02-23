import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MongooseObjectId, Populated } from 'src/_utils/types';
import { Project, ProjectDocument } from 'src/projects/project.schema';

export type DeploymentDocument = HydratedDocument<Deployment>;

@Schema({ timestamps: true, versionKey: false })
export class Deployment {
  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: MongooseObjectId, ref: Project.name, required: true })
  project: Populated<ProjectDocument>;

  @Prop({ type: String, required: true })
  organizationName: string;

  @Prop({ type: String, required: true })
  projectName: string;

  @Prop({ type: String, default: 'devver.app' })
  organizationDomain: string;

  // Container configuration
  @Prop({
    type: {
      image: String,
      port: Number,
      type: { type: String, enum: ['app', 'os'] },
      command: [String],
      args: [String],
    },
    _id: false,
  })
  container: {
    image: string;
    port: number;
    type: 'app' | 'os';
    command?: string[];
    args?: string[];
  };

  // Resources configuration
  @Prop({
    type: {
      requests: {
        memory: String,
        cpu: String,
      },
      limits: {
        memory: String,
        cpu: String,
      },
    },
    _id: false,
  })
  resources: {
    requests: {
      memory: string;
      cpu: string;
    };
    limits: {
      memory: string;
      cpu: string;
    };
  };

  // Persistence configuration
  @Prop({
    type: {
      enabled: Boolean,
      size: String,
      mountPath: String,
    },
    _id: false,
  })
  persistence: {
    enabled: boolean;
    size?: string;
    mountPath?: string;
  };

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  replicaCount: number;

  @Prop({
    type: {
      http: { type: Number, default: 80 },
      https: { type: Number, default: 443 },
    },
    default: { http: 80, https: 443 },
    _id: false,
  })
  ports: {
    http: number;
    https: number;
  };

  @Prop({ type: Map, of: String, default: {} })
  labels: Map<string, string>;

  @Prop({ type: Map, of: String, default: {} })
  annotations: Map<string, string>;

  @Prop({ type: String, required: true })
  githubPath: string;

  @Prop({
    type: String,
    enum: ['pending', 'deployed', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'deployed' | 'failed';
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);

// Indexes
DeploymentSchema.index({ organizationId: 1, project: 1 });
DeploymentSchema.index(
  { organizationName: 1, projectName: 1 },
  { unique: true },
);
DeploymentSchema.index({ status: 1 });
DeploymentSchema.index({ createdAt: -1 });
