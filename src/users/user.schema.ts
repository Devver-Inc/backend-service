import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument } from "mongoose";
import { RoleEnum } from "src/_utils/enums/role.enum";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ enum: RoleEnum, default: RoleEnum.USER, required: true })
  role: RoleEnum;

  @Prop({ type: String, default: null })
  recoveryToken: string | null;

  @Prop({ type: Date, default: null })
  recoveryTokenExpiresAt: Date | null;

  @Prop({ type: String, default: null })
  refreshToken: string | null;

  @Prop({ type: Date, default: null })
  refreshTokenExpiresAt: Date | null;

  @Prop({ type: Boolean, default: false })
  rememberMe: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 });
UserSchema.index({ recoveryToken: 1 });
UserSchema.index({ refreshToken: 1 });
