import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ROLES_KEY } from 'src/_utils/constants';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { ErrorCodes } from '../enums/error-codes.enum';
import { RequireOrganizationGuard } from '../guards/require-organization.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ProtectedAutoRolesDecorator } from './protected-auto-roles.decorator';

export type ProtectOptions = {
  roles?: UserRoleEnum[];
  skipOrganizationCheck?: boolean;
};

/** Authentication is global (AccessTokenGuard); this adds organization and role checks. */
export function Protect(opts?: ProtectOptions) {
  const guards = opts?.skipOrganizationCheck
    ? [RolesGuard]
    : [RolesGuard, RequireOrganizationGuard];

  return applyDecorators(
    SetMetadata(ROLES_KEY, opts),
    ApiBearerAuth(),
    UseGuards(...guards),
    ApiUnauthorizedResponse({ description: ErrorCodes.UNAUTHORIZED }),
    ProtectedAutoRolesDecorator(opts),
  );
}
