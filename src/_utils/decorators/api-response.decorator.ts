import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse as NestApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { PaginationMetaDto } from '../pagination/responses/pagination.dto';

export const ApiResponseDecorator = <TModel extends Type<any>>(
  model: TModel,
  statusCode: number = HttpStatus.OK,
  isArray: boolean = true,
) => {
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    NestApiResponse({
      status: statusCode,
      schema: {
        properties: {
          data: isArray
            ? {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              }
            : {
                $ref: getSchemaPath(model),
              },
          meta: {
            $ref: getSchemaPath(PaginationMetaDto),
          },
        },
      },
    }),
  );
};
