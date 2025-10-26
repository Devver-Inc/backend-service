import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { MongoError } from "mongodb";
import { Error as MongooseError } from "mongoose";
import { ErrorCodes } from "../enums/error-codes.enum";

@Catch(MongoError, MongooseError)
export class MongoErrorException implements ExceptionFilter {
  catch(exception: MongoError | MongooseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Mongoose DocumentNotFoundError
    if (exception instanceof MongooseError.DocumentNotFoundError) {
      return response.status(HttpStatus.NOT_FOUND).json({
        message: ErrorCodes.NOT_FOUND,
        error: "Document not found",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    // Mongoose CastError (invalid ObjectId format)
    if (exception instanceof MongooseError.CastError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        message: ErrorCodes.INVALID_ID_FORMAT,
        error: "Invalid ID format",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Mongoose ValidationError
    if (exception instanceof MongooseError.ValidationError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        message: ErrorCodes.VALIDATION_ENTITY_NOT_FOUND,
        error: exception.message,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // MongoDB Duplicate key error (E11000)
    if ("code" in exception && exception.code === 11000) {
      return response.status(HttpStatus.CONFLICT).json({
        message: ErrorCodes.UNIQUE_CONSTRAINT,
        error: "Unique Constraint Violation",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: exception.message,
      error: "Internal Server Error",
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
