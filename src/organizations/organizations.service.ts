import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { toPaginatedDto } from 'src/_utils/pagination/pagination.mapper';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { LogtoInvitation } from 'src/logto/_utils/types/responses/invitation.types';
import {
  LogtoOrganization,
  LogtoUser,
} from 'src/logto/_utils/types/responses/responses.type';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { LogtoRequests } from 'src/logto/logto.requests';
import { UsersPaginatedQueryDto } from 'src/users/_utils/dto/query/user-paginated-query.dto';
import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';
import { UsersMapper } from 'src/users/user.mapper';
import { CreateInvitationDto } from './_utils/dto/requests/create-invitation.dto';
import { UpdateInvitationStatusDto } from './_utils/dto/requests/update-invitation-status.dto';
import { GetInvitationDto } from './_utils/dto/responses/get-invitation.dto';
import { GetOrganizationDetailsDto } from './_utils/dto/responses/get-organization-details.dto';
import { InvitationStatusEnum } from './_utils/enums/invitations-status.enum';
import { UpdateInvitationStatusEnum } from './_utils/enums/update-invitations-status.enum';
import { OrganizationsMapper } from './organization.mapper';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsMapper: OrganizationsMapper,
    private readonly logtoRequests: LogtoRequests,
    private readonly usersMapper: UsersMapper,
  ) {}

  getOrganizationInformations(organization: LogtoOrganization) {
    return this.organizationsMapper.toOrganizationLightDto(organization);
  }

  async getOrganizationDetails(
    organization: LogtoOrganization,
  ): Promise<GetOrganizationDetailsDto> {
    const { members } = await this.logtoRequests.getOrganizationMembers(
      organization.id,
    );
    const ownerId = organization.customData.ownerId;
    const adminsIdsSet = new Set<string>(organization.customData.adminIds);
    const { owner, admins } = members.reduce(
      (acc, member) => {
        if (member.id === ownerId) {
          acc.owner = member;
        }
        if (adminsIdsSet.has(member.id)) {
          acc.admins.push(member);
        }
        return acc;
      },
      { owner: null as LogtoUser | null, admins: [] as LogtoUser[] },
    );

    return this.organizationsMapper.toOrganizationDetailsDto(
      organization,
      members,
      owner,
      admins,
    );
  }

  async getOrganizationMembers(
    organization: LogtoOrganization,
    paginatedQueryDto: UsersPaginatedQueryDto,
  ): Promise<PaginationDto<GetUserLightDto[]>> {
    if (!paginatedQueryDto.rolesFilter?.length) {
      const query =
        this.organizationsMapper.toGetOrganizationMembersQuery(
          paginatedQueryDto,
        );
      const { members, totalItemsCount } =
        await this.logtoRequests.getOrganizationMembers(organization.id, query);

      return toPaginatedDto(
        members,
        paginatedQueryDto,
        totalItemsCount,
        this.usersMapper.toUserLightDto,
      );
    }

    const { members } = await this.logtoRequests.getOrganizationMembers(
      organization.id,
    );
    const filteredMembers = members.filter(async (member) => {
      if (paginatedQueryDto.search) {
        return member.name
          ?.toLowerCase()
          .includes(paginatedQueryDto.search.toLowerCase());
      }
      if (paginatedQueryDto.rolesFilter) {
        const roles = await this.logtoRequests.getUserRoles(
          member.id,
          organization.id,
        );
        return paginatedQueryDto.rolesFilter.some((role) =>
          roles.some((r) => r.name === role),
        );
      }
      return true;
    });

    return toPaginatedDto(
      filteredMembers,
      paginatedQueryDto,
      filteredMembers.length,
      this.usersMapper.toUserLightDto,
    );
  }

  async createInvitation(
    user: LogtoUserWithOrganizations,
    createInvitationDto: CreateInvitationDto,
  ): Promise<GetInvitationDto> {
    if (!user.currentOrganization) {
      throw new BadRequestException(
        'User must be part of an organization to create invitations',
      );
    }

    const invitation = await this.logtoRequests.createOrganizationInvitation(
      user,
      createInvitationDto,
    );
    const organization = await this.logtoRequests.fetchOrganizationInformations(
      user.currentOrganization.id,
    );
    await this.logtoRequests.resendInvitationMessage(
      invitation,
      organization.name,
    );

    return this.organizationsMapper.toInvitationDto(
      invitation,
      organization.name,
    );
  }

  async getOrganizationInvitations(user: LogtoUserWithOrganizations) {
    if (!user.currentOrganization) {
      throw new BadRequestException(
        'User must be part of an organization to fetch invitations',
      );
    }

    const invitations = (
      await this.logtoRequests.getOrganizationInvitations(
        user.currentOrganization.id,
      )
    ).filter((i) => i.status !== InvitationStatusEnum.ACCEPTED);

    return this.organizationsMapper.toInvitationDtoFromArray(invitations);
  }

  async getInvitationById(
    invitation: LogtoInvitation,
  ): Promise<GetInvitationDto> {
    const organization = await this.logtoRequests.fetchOrganizationInformations(
      invitation.organizationId,
    );
    return this.organizationsMapper.toInvitationDto(
      invitation,
      organization.name,
    );
  }

  async getUserInvitations(user: LogtoUser): Promise<GetInvitationDto[]> {
    if (!user.primaryEmail) {
      throw new BadRequestException(
        'User must have a verified email to fetch invitations',
      );
    }

    const invitations = (
      await this.logtoRequests.getUserInvitations(user.primaryEmail)
    ).filter((i) => i.status === InvitationStatusEnum.PENDING);

    const invitationsWithOrgNames = await Promise.all(
      invitations.map(async (invitation) => {
        const organization =
          await this.logtoRequests.fetchOrganizationInformations(
            invitation.organizationId,
          );
        return this.organizationsMapper.toInvitationDto(
          invitation,
          organization.name,
        );
      }),
    );

    return invitationsWithOrgNames;
  }

  async updateInvitationStatus(
    user: LogtoUser,
    invitation: LogtoInvitation,
    dto: UpdateInvitationStatusDto,
  ): Promise<void> {
    if (dto.status === UpdateInvitationStatusEnum.ACCEPTED) {
      if (!user.primaryEmail) {
        throw new BadRequestException(
          'User must have a verified email to accept invitations',
        );
      }

      if (user.primaryEmail !== invitation.invitee) {
        throw new ForbiddenException(
          'This invitation is not for the current user',
        );
      }

      await this.logtoRequests.updateOrganizationInvitationStatus(
        invitation.id,
        dto.status,
        user.id,
      );
    } else if (dto.status === UpdateInvitationStatusEnum.REVOKED) {
      await this.logtoRequests.updateOrganizationInvitationStatus(
        invitation.id,
        dto.status,
      );
    }
  }

  async transferOwnership(
    organization: LogtoOrganization,
    newOwner: LogtoUser,
  ): Promise<LogtoOrganization> {
    if (organization.customData.ownerId === newOwner.id) {
      throw new BadRequestException(
        'You cannot transfer ownership to yourself',
      );
    }
    if (!organization.customData.adminIds.includes(newOwner.id)) {
      throw new BadRequestException(
        'The new owner is not an administrator of the organization',
      );
    }
    return this.logtoRequests.updateOrganization(organization.id, {
      customData: {
        ownerId: newOwner.id,
        adminIds: organization.customData.adminIds,
      },
    });
  }

  async removeUserFromOrganization(
    organization: LogtoOrganization,
    currentUser: LogtoUserWithOrganizations,
    userToRemove: LogtoUser,
  ): Promise<LogtoOrganization> {
    if (organization.customData.ownerId === userToRemove.id) {
      throw new BadRequestException(
        'You cannot remove the owner from the organization',
      );
    }

    const currentUserOrganization = currentUser.currentOrganization;
    if (
      !currentUserOrganization ||
      currentUserOrganization.id !== organization.id
    ) {
      throw new BadRequestException('You are not a member of the organization');
    }

    const currentUserRoles = await this.logtoRequests.getUserRoles(
      currentUser.id,
      organization.id,
    );
    if (
      userToRemove.id !== currentUser.id &&
      !currentUserRoles.some((role) => role.name === UserRoleEnum.ADMIN)
    ) {
      throw new ForbiddenException(
        'You are not allowed to remove this user from the organization',
      );
    }

    const { members } = await this.logtoRequests.getOrganizationMembers(
      organization.id,
    );
    if (members.length === 1) {
      // TODO: If the organization has only one member, delete the organization
      throw new BadRequestException(
        'You cannot quit an organization if you are the only member',
      );
    }

    if (organization.customData.adminIds.includes(userToRemove.id)) {
      await this.logtoRequests.updateOrganization(organization.id, {
        customData: {
          ...organization.customData,
          adminIds: organization.customData.adminIds.filter(
            (id) => id !== userToRemove.id,
          ),
        },
      });
    }
    await this.logtoRequests.removeUserFromOrganization(
      organization.id,
      userToRemove.id,
    );

    return this.logtoRequests.fetchOrganizationInformations(organization.id);
  }
}
