import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Position } from 'src/_utils/schemas/position.schema';
import { MongooseObjectId } from 'src/_utils/types';
import { Project } from 'src/projects/project.schema';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true, versionKey: false })
export class Comment {
  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: MongooseObjectId, ref: Project.name, required: true })
  projectId: Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: false })
  repo?: string;

  @Prop({ type: String, required: false })
  branch?: string;

  @Prop({ type: String, required: false })
  guestEmail?: string;

  @Prop({ type: Position, required: false })
  position?: Position;

  createdAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

CommentSchema.index({ projectId: 1 });
CommentSchema.index({ userId: 1 });
CommentSchema.index({ organizationId: 1, projectId: 1, repo: 1, branch: 1 });
