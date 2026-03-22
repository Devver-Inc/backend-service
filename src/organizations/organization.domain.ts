import {
  LogtoOrganization,
  LogtoUser,
} from 'src/logto/_utils/types/responses/responses.type';

interface OrganizationDomainProps {
  id: string;
  name: string;
  ownerId: string;
  adminIds: readonly string[];
  memberIds: string[];
}

export class OrganizationDomain {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly adminIds: readonly string[];
  readonly memberIds: string[];

  private constructor(props: OrganizationDomainProps) {
    this.id = props.id;
    this.name = props.name;
    this.ownerId = props.ownerId;
    this.adminIds = props.adminIds;
    this.memberIds = props.memberIds;
  }

  static fromLogtoOrganization(
    org: LogtoOrganization,
    members: LogtoUser[],
  ): OrganizationDomain {
    return new OrganizationDomain({
      id: org.id,
      name: org.name,
      ownerId: org.customData.ownerId,
      adminIds: org.customData.adminIds,
      memberIds: members.map((m) => m.id),
    });
  }

  isOwner(userId: string): boolean {
    return this.ownerId === userId;
  }

  isAdmin(userId: string): boolean {
    return this.adminIds.includes(userId);
  }

  isMember(userId: string): boolean {
    return this.memberIds.includes(userId);
  }

  withNewOwner(newOwnerId: string): OrganizationDomain {
    return new OrganizationDomain({ ...this, ownerId: newOwnerId });
  }

  canRemoveMember(
    requesterId: string,
    targetId: string,
    requesterIsAdmin: boolean,
  ): boolean {
    if (targetId !== requesterId && !requesterIsAdmin) return false;
    return true;
  }

  canDelete(): boolean {
    return this.memberIds.length <= 1;
  }

  classifyMembers(members: LogtoUser[]): {
    owner: LogtoUser | null;
    admins: LogtoUser[];
  } {
    const adminsSet = new Set(this.adminIds);
    return members.reduce(
      (acc, member) => {
        if (member.id === this.ownerId) acc.owner = member;
        if (adminsSet.has(member.id)) acc.admins.push(member);
        return acc;
      },
      { owner: null as LogtoUser | null, admins: [] as LogtoUser[] },
    );
  }
}
