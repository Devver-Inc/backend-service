import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import {
  LogtoOrganization,
  LogtoOrganizationMember,
} from 'src/logto/_utils/types/responses/responses.type';

interface OrganizationDomainProps {
  id: string;
  name: string;
  ownerId: string;
  members: LogtoOrganizationMember[];
}

export class OrganizationDomain {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly members: LogtoOrganizationMember[];

  private constructor(props: OrganizationDomainProps) {
    this.id = props.id;
    this.name = props.name;
    this.ownerId = props.ownerId;
    this.members = props.members;
  }

  static fromLogtoOrganization(
    org: LogtoOrganization,
    members: LogtoOrganizationMember[],
  ): OrganizationDomain {
    return new OrganizationDomain({
      id: org.id,
      name: org.name,
      ownerId: org.customData.ownerId,
      members,
    });
  }

  isOwner(userId: string): boolean {
    return this.ownerId === userId;
  }

  /** Logto's `admin` role is the only source of truth for admins. */
  isAdmin(userId: string): boolean {
    return this.admins().some((member) => member.id === userId);
  }

  canDelete(): boolean {
    return this.members.length <= 1;
  }

  owner(): LogtoOrganizationMember | null {
    return this.members.find((member) => member.id === this.ownerId) ?? null;
  }

  admins(): LogtoOrganizationMember[] {
    return this.members.filter((member) =>
      member.organizationRoles.some((role) => role.name === UserRoleEnum.ADMIN),
    );
  }
}
