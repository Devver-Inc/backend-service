import { ValidationOptions } from "class-validator";
import { QueryFilter, PopulateOptions } from "mongoose";

export interface CustomValidationOptions<T> {
  property?: keyof T | "_id" | undefined;
  queries?: QueryFilter<T> | undefined;
  excludeDeleted?: boolean | undefined;
  populate?: PopulateOptions | (PopulateOptions | string)[];
}

export type UniqueExistsValidationOptions<T> = CustomValidationOptions<T> &
  ValidationOptions;
