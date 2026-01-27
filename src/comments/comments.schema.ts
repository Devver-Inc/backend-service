import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Position } from 'src/_utils/schemas/position.schema';
import { MongooseObjectId, Populated } from 'src/_utils/types';
import { Project, ProjectDocument } from 'src/projects/project.schema';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true, versionKey: false })
export class Comment {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: MongooseObjectId, ref: Project.name })
  project: Populated<ProjectDocument>;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: Position, required: true })
  position: Position;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
