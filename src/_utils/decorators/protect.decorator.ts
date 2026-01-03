import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger'
import { ROLES_KEY } from 'src/_utils/constants'
import { RolesGuard } from '../guards/roles.guard'
import { ProtectedAutoRolesDecorator } from './protected-auto-roles.decorator'
import { AccessTokenGuard } from 'src/logto/_utils/middleware/access-token.guard'
import { UserPermissionsEnum, UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum'

export type ProtectOptions = {
  roles?: UserRoleEnum[]
  permissions?: UserPermissionsEnum[]
}

export function Protect(_opts?: ProtectOptions) {
  return applyDecorators(
    SetMetadata(ROLES_KEY, _opts),
    ApiBearerAuth(),
    UseGuards(AccessTokenGuard, RolesGuard),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ProtectedAutoRolesDecorator(_opts),
  )
}
