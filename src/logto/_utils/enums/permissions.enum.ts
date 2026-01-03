export enum UserRoleEnum {
  ADMIN = "admin",
  DEVELOPER = "developer",
  VIEWER = "viewer",
}

export enum UserPermissionsEnum {
  // Super Admin
  SUPER_ADMIN = "super:admin",
}

export const UserRoles: Record<
  UserRoleEnum,
  { name: UserRoleEnum; permissions: UserPermissionsEnum[] }
> = {
  [UserRoleEnum.ADMIN]: {
    name: UserRoleEnum.ADMIN,
    permissions: [],
  },

  [UserRoleEnum.DEVELOPER]: {
    name: UserRoleEnum.DEVELOPER,
    permissions: [],
  },

  [UserRoleEnum.VIEWER]: {
    name: UserRoleEnum.VIEWER,
    permissions: [],
  },
} as const;

export type UserRoleNames = keyof typeof UserRoleEnum;
