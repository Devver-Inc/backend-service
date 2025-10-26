import { ValidationOptions } from 'class-validator';
import { FilterQuery, PopulateOptions } from 'mongoose';

export interface CustomValidationOptions<T> {
  property?: keyof T | '_id' | undefined;
  queries?: FilterQuery<T> | undefined;
  excludeDeleted?: boolean | undefined;
  populate?: PopulateOptions | (PopulateOptions | string)[];
}

export type UniqueExistsValidationOptions<T> = CustomValidationOptions<T> & ValidationOptions;
