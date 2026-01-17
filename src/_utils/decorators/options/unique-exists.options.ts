import { ValidationOptions } from 'class-validator';
import { QueryFilter } from 'mongoose';

export interface CustomValidationOptions<T> {
  property?: keyof T | '_id' | undefined;
  queries?: QueryFilter<T> | undefined;
  excludeDeleted?: boolean | undefined;
}

export type UniqueExistsValidationOptions<T> = CustomValidationOptions<T> &
  ValidationOptions;
