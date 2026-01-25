// protect.decorator.ts
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ROLES_KEY } from 'src/_utils/constants';
import { RolesGuard } from '../guards/roles.guard';
import { ProtectedAutoRolesDecorator } from './protected-auto-roles.decorator';
import { AccessTokenGuard } from 'src/logto/_utils/middleware/access-token.guard';
import {
  UserPermissionsEnum,
  UserRoleEnum,
} from 'src/logto/_utils/enums/permissions.enum';
import { RequireOrganizationGuard } from '../guards/require-organization.guard';

export type ProtectOptions = {
  roles?: UserRoleEnum[];
  permissions?: UserPermissionsEnum[];
  skipOrganizationCheck?: boolean;
};

export function Protect(opts?: ProtectOptions) {
  const guards: any[] = [AccessTokenGuard, RolesGuard];

  if (!opts?.skipOrganizationCheck) {
    guards.push(RequireOrganizationGuard);
  }

  return applyDecorators(
    SetMetadata(ROLES_KEY, opts),
    ApiBearerAuth(),
    UseGuards(...guards),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ProtectedAutoRolesDecorator(opts),
  );
}
