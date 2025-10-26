import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ProtectedAutoRolesDecorator } from './protected-auto-roles.decorator';
import { JwtAuthGuard } from 'src/auth/strategy/jwt-auth.guard';
import { RoleEnum } from "src/_utils/enums/role.enum";

export function Protect(...rolesRequired: RoleEnum[]) {
  return applyDecorators(
    SetMetadata('rolesRequired', rolesRequired),
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ProtectedAutoRolesDecorator(...rolesRequired),
  );
}
