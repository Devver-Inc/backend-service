import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class ApiResponsesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const query = request.query;

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    return next.handle().pipe(
      map((responseData) => {
        if (
          responseData &&
          typeof responseData === 'object' &&
          responseData.data !== undefined &&
          responseData.meta !== undefined
        ) {
          return responseData;
        }

        if (
          responseData &&
          typeof responseData === 'object' &&
          Array.isArray(responseData.data) &&
          typeof responseData.totalCount === 'number'
        ) {
          const totalCount = responseData.totalCount;
          const totalPages = Math.ceil(totalCount / limit);

          return {
            data: responseData.data,
            meta: {
              page,
              limit,
              totalCount,
              totalPages,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1,
            },
          };
        }

        return {
          ...responseData,
        };
      }),
    );
  }
}
