import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SshKeyDocument = HydratedDocument<SshKey>;

@Schema({ timestamps: true })
export class SshKey {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  publicKey: string;

  @Prop({ required: true })
  fingerprint: string;

  createdAt: Date;
  updatedAt: Date;
}

export const SshKeySchema = SchemaFactory.createForClass(SshKey);

SshKeySchema.index({ userId: 1 });
SshKeySchema.index({ fingerprint: 1 }, { unique: true });
