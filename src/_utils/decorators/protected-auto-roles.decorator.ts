import { DECORATORS } from "@nestjs/swagger/dist/constants";
import type { ProtectOptions } from "./protect.decorator";
import {
  UserRoleEnum,
  UserPermissionsEnum,
} from "src/logto/_utils/enums/permissions.enum";

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
    if (!descriptor?.value || typeof descriptor.value !== "function") {
      return;
    }

    const existingMetadata = Reflect.getMetadata(
      DECORATORS.API_OPERATION,
      descriptor.value,
    ) as ApiOperationMetadata | undefined;

    const current: ApiOperationMetadata = {
      summary: "",
      ...existingMetadata,
    };

    const roles: UserRoleEnum[] = opts?.roles ?? [];
    const permissions: UserPermissionsEnum[] = opts?.permissions ?? [];

    const uniquePermissions = [...new Set(permissions)];
    const uniqueRoles = [...new Set(roles)];
    const combinedLabels = [...uniquePermissions, ...uniqueRoles];

    current.summary += ` (${combinedLabels.join(", ") || "all"})`;

    Reflect.defineMetadata(DECORATORS.API_OPERATION, current, descriptor.value);
  };
}
