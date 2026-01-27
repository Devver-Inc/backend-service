import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false, timestamps: false, versionKey: false })
export class Position {
  @Prop({ type: String, required: true })
  pageUrl: string;

  @Prop({ type: String, required: true })
  anchor: string;

  @Prop({ type: Number, required: true })
  normX: number;

  @Prop({ type: Number, required: true })
  normY: number;

  @Prop({ type: Number, required: true })
  anchorOffsetX: number;

  @Prop({ type: Number, required: true })
  anchorOffsetY: number;
}
