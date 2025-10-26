import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { RoleEnum } from "src/_utils/enums/role.enum";
import { merge } from 'lodash';

export function ProtectedAutoRolesDecorator(...roles: RoleEnum[]) {
  return (_target: any, _key: any, descriptor: any) => {
    const current = merge({ summary: '' }, Reflect.getMetadata(DECORATORS.API_OPERATION, descriptor.value));
    current.summary += ` (${roles.join(', ') || 'ALL'})`;
    Reflect.defineMetadata(DECORATORS.API_OPERATION, current, descriptor.value);
  };
}
