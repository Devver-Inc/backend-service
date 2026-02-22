import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

@Catch(MongoError, MongooseError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoError | MongooseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const isDev = process.env.NODE_ENV !== 'production';

    if (exception instanceof MongooseError.DocumentNotFoundError) {
      return response.status(HttpStatus.NOT_FOUND).json({
        message: 'DOCUMENT_NOT_FOUND',
        error: 'The requested document does not exist',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (exception instanceof MongooseError.CastError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        message: 'INVALID_FIELD_TYPE',
        field: exception.path,
        value: exception.value,
        expectedType: exception.kind,
        error: `Invalid value "${exception.value}" for field "${exception.path}"`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (exception instanceof MongooseError.ValidationError) {
      const errors = Object.values(exception.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value,
        kind: err.kind,
      }));

      return response.status(HttpStatus.BAD_REQUEST).json({
        message: 'VALIDATION_ERROR',
        errors,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (exception instanceof MongoError && (exception as any).code === 11000) {
      const keyPattern = (exception as any).keyPattern || {};
      const keyValue = (exception as any).keyValue || {};

      const field = Object.keys(keyPattern)[0];
      const value = keyValue[field];

      return response.status(HttpStatus.CONFLICT).json({
        message: 'UNIQUE_CONSTRAINT_VIOLATION',
        field,
        value,
        error: `Duplicate value for field "${field}"`,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (exception instanceof MongoError) {
      return response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        message: 'DATABASE_ERROR',
        error: exception.message,
        stack: isDev ? exception.stack : undefined,
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'UNKNOWN_DATABASE_ERROR',
      error: exception.message,
      stack: isDev ? exception.stack : undefined,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
