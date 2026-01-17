import {
  Injectable,
  PipeTransform,
  Inject,
  Type,
  BadRequestException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { isValidObjectId } from 'mongoose';
import { ErrorCodes } from '../enums/error-codes.enum';

export interface BaseRepository {
  findOneByIdOrThrow(id: string): Promise<any>;
}

export interface PipeOptions {
  include?: any;
}

@Injectable()
export class EntityByIdPipe<T> implements PipeTransform<string, Promise<T>> {
  constructor(private readonly moduleRef: ModuleRef) {}

  static for<T>(repositoryClass: Type<BaseRepository>) {
    @Injectable()
    class ConfiguredPipe implements PipeTransform<string, Promise<T>> {
      constructor(
        @Inject(repositoryClass) public readonly repository: BaseRepository,
      ) {}

      async transform(id: string): Promise<T> {
        if (!isValidObjectId(id)) {
          throw new BadRequestException(ErrorCodes.INVALID_ID_FORMAT);
        }
        return this.repository.findOneByIdOrThrow(id) as Promise<T>;
      }
    }
    return ConfiguredPipe;
  }

  async transform(): Promise<T> {
    throw new Error(
      'Use EntityByIdPipe.for(RepositoryClass) instead of direct instantiation',
    );
  }
}
