import { Types } from 'mongoose';
import { InternalServerErrorException } from '@nestjs/common';
import { isObject } from 'class-validator';
import { ErrorCodes } from '../enums/error-codes.enum';

export function IsPopulated<T>(
  document: T | Types.ObjectId | string | null | undefined,
): document is T {
  return !(document instanceof Types.ObjectId || !isObject(document));
}

export function IsPopulatedOrFail<T>(
  document: T | Types.ObjectId | string | null | undefined,
  name?: string,
): document is T {
  if (!IsPopulated(document))
    throw new InternalServerErrorException(
      `${name ?? 'document' + ErrorCodes.POPULATION_ERROR}`,
    );
  return true;
}

export function SafePopulated<T>(
  document: T | Types.ObjectId | string | null | undefined,
): T {
  IsPopulatedOrFail(document);
  return document as T;
}
