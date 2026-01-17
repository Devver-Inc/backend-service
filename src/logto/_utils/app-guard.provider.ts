import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guard/jwt-auth.guard';

export const AppGuardProvider = {
  provide: APP_GUARD,
  useClass: JwtAuthGuard,
};
