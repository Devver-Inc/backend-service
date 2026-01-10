import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class MinioFile {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  size: number;
}

export const MinioFileSchema = SchemaFactory.createForClass(MinioFile);
