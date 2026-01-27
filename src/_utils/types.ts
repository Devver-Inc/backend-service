import { WithId } from 'mongodb';
import * as mongoose from 'mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const MongooseObjectId = mongoose.Schema.Types.ObjectId;
export type Populated<T> = Types.ObjectId | T;

export type MongoId = Types.ObjectId | string;

export type DocOrLean<T> = HydratedDocument<T> | WithId<T>;
