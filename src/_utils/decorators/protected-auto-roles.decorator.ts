import type { ProtectOptions } from './protect.decorator';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';

const API_OPERATION_METADATA = 'swagger/apiOperation';

interface ApiOperationMetadata {
  summary?: string;
  [key: string]: unknown;
}

export function ProtectedAutoRolesDecorator(
  opts?: ProtectOptions,
): MethodDecorator & ClassDecorator {
  return (
    _target: object,
    _propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (!descriptor?.value || typeof descriptor.value !== 'function') {
      return;
    }

    const existingMetadata = Reflect.getMetadata(
      API_OPERATION_METADATA,
      descriptor.value,
    ) as ApiOperationMetadata | undefined;

    const current: ApiOperationMetadata = {
      summary: '',
      ...existingMetadata,
    };

    const roles: UserRoleEnum[] = [...new Set(opts?.roles ?? [])];
    current.summary += ` (${roles.join(', ') || 'all'})`;

    Reflect.defineMetadata(API_OPERATION_METADATA, current, descriptor.value);
  };
}
