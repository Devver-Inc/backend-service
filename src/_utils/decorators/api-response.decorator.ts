import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse as NestApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiResponseMetaDto } from '../dto/response/api-meta-response.dto';

export const ApiResponseDecorator = <TModel extends Type<any>>(
  model: TModel,
  statusCode: number = HttpStatus.OK,
  isArray: boolean = true,
) => {
  return applyDecorators(
    ApiExtraModels(model, ApiResponseMetaDto),
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
            $ref: getSchemaPath(ApiResponseMetaDto),
          },
        },
      },
    }),
  );
};
