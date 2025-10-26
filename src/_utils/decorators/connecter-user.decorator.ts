import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ConnectedUser = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user ?? null,
);
