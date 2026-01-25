import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthInfo } from 'src/logto/_utils/types/auth-info.types';

@Injectable()
export class RequireOrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.auth as AuthInfo;

    if (!auth.selectedOrganization) {
      throw new ForbiddenException('Organization context required');
    }

    return true;
  }
}
