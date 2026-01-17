import { Injectable } from '@nestjs/common';
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
import { MinioMapper } from 'src/minio/minio.mapper';
import { UsersPaginatedQueryDto } from 'src/users/_utils/dto/query/user-paginated-query.dto';
import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';
import { UsersMapper } from 'src/users/user.mapper';
import { CreateInvitationDto } from './_utils/dto/requests/create-invitation.dto';
import { CreateOrganizationDto } from './_utils/dto/requests/create-organization.dto';
import { UpdateInvitationStatusDto } from './_utils/dto/requests/update-invitation-status.dto';
import { UpdateOrganizationDto } from './_utils/dto/requests/update-organization.dto';
import { GetInvitationDto } from './_utils/dto/responses/get-invitation.dto';
import { GetOrganizationDetailsDto } from './_utils/dto/responses/get-organization-details.dto';
import { GetOrganizationLightDto } from './_utils/dto/responses/get-organization-light.dto';
import { InvitationStatusEnum } from './_utils/enums/invitations-status.enum';
import { UpdateInvitationStatusEnum } from './_utils/enums/update-invitations-status.enum';
import { OrganizationsMapper } from './organization.mapper';
import { FileUploadService } from 'src/minio/file-upload.service';
import { OrganizationsExceptions } from './_utils/errors/organizations-exceptions';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsMapper: OrganizationsMapper,
    private readonly logtoRequests: LogtoRequests,
    private readonly usersMapper: UsersMapper,
    private readonly fileUploadService: FileUploadService,
    private readonly minioMapper: MinioMapper,
    private readonly exceptions: OrganizationsExceptions,
  ) {}

  async createOrganization(
    createOrganizationDto: CreateOrganizationDto,
    user: LogtoUser,
  ): Promise<GetOrganizationLightDto> {
    const organization = await this.logtoRequests.createOrganization({
      name: createOrganizationDto.name,
      description: createOrganizationDto.description,
      customData: this.organizationsMapper.toOrganizationCustomDataType(
        user.id,
        [user.id],
      ),
    });

    const fileMapping = createOrganizationDto.logoFile
      ? [
          {
            file: createOrganizationDto.logoFile,
            key: this.minioMapper.toOrganizationLogoKey(
              organization.id,
              createOrganizationDto.logoFile.extension,
            ),
          },
        ]
      : [];

    return this.fileUploadService.uploadFilesWithCleanup(
      fileMapping,
      async () => {
        const logoUrl = createOrganizationDto.logoFile
          ? this.minioMapper.toOrganizationLogoUrl(
              organization.id,
              createOrganizationDto.logoFile.extension,
            )
          : undefined;

        const updatedOrganization = await this.logtoRequests.updateOrganization(
          organization.id,
          {
            name: createOrganizationDto.name,
            description: createOrganizationDto.description,
            ...(logoUrl && {
              branding: {
                logoUrl,
              },
            }),
          },
        );

        await this.logtoRequests.addUsersToOrganization(
          updatedOrganization.id,
          [user.id],
        );

        return this.organizationsMapper.toOrganizationLightDto(
          updatedOrganization,
        );
      },
    );
  }

  async updateOrganization(
    user: LogtoUserWithOrganizations,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<GetOrganizationLightDto> {
    const fileMapping = updateOrganizationDto.logoFile
      ? [
          {
            file: updateOrganizationDto.logoFile,
            key: this.minioMapper.toOrganizationLogoKey(
              user.currentOrganization.id,
              updateOrganizationDto.logoFile.extension,
            ),
          },
        ]
      : [];

    return this.fileUploadService.uploadFilesWithCleanup(
      fileMapping,
      async () => {
        const logoUrl = updateOrganizationDto.logoFile
          ? this.minioMapper.toOrganizationLogoUrl(
              user.currentOrganization.id,
              updateOrganizationDto.logoFile.extension,
            )
          : undefined;

        const updatedOrganization = await this.logtoRequests.updateOrganization(
          user.currentOrganization.id,
          {
            name: updateOrganizationDto.name,
            description: updateOrganizationDto.description,
            ...(logoUrl && {
              branding: {
                logoUrl,
              },
            }),
          },
        );

        return this.organizationsMapper.toOrganizationLightDto(
          updatedOrganization,
        );
      },
    );
  }

  async deleteOrganization(user: LogtoUserWithOrganizations): Promise<void> {
    const { members } = await this.logtoRequests.getOrganizationMembers(
      user.currentOrganization.id,
    );

    if (members.length > 1) {
      throw this.exceptions.CANNOT_DELETE_WITH_MULTIPLE_MEMBERS;
    }

    await this.logtoRequests.deleteOrganization(user.currentOrganization.id);
  }

  async getOrganizationInformations(
    user: LogtoUserWithOrganizations,
  ): Promise<GetOrganizationLightDto> {
    return this.organizationsMapper.toOrganizationLightDto(
      user.currentOrganization,
    );
  }

  async getOrganizationDetails(
    user: LogtoUserWithOrganizations,
  ): Promise<GetOrganizationDetailsDto> {
    const { members } = await this.logtoRequests.getOrganizationMembers(
      user.currentOrganization.id,
    );
    const ownerId = user.currentOrganization.customData.ownerId;
    const adminsIdsSet = new Set<string>(
      user.currentOrganization.customData.adminIds,
    );
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
      user.currentOrganization,
      members,
      owner,
      admins,
    );
  }

  async getOrganizationMembers(
    user: LogtoUserWithOrganizations,
    paginatedQueryDto: UsersPaginatedQueryDto,
  ): Promise<PaginationDto<GetUserLightDto[]>> {
    if (!paginatedQueryDto.rolesFilter?.length) {
      const query =
        this.organizationsMapper.toGetOrganizationMembersQuery(
          paginatedQueryDto,
        );
      const { members, totalItemsCount } =
        await this.logtoRequests.getOrganizationMembers(
          user.currentOrganization.id,
          query,
        );

      return toPaginatedDto(
        members,
        paginatedQueryDto,
        totalItemsCount,
        this.usersMapper.toUserLightDto,
      );
    }

    const { members } = await this.logtoRequests.getOrganizationMembers(
      user.currentOrganization.id,
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
          user.currentOrganization.id,
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
      throw this.exceptions.USER_MUST_HAVE_EMAIL_FOR_INVITATIONS;
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
        throw this.exceptions.USER_MUST_HAVE_EMAIL_FOR_INVITATIONS;
      }

      if (user.primaryEmail !== invitation.invitee) {
        throw this.exceptions.INVITATION_NOT_FOR_CURRENT_USER;
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
    user: LogtoUserWithOrganizations,
    newOwner: LogtoUser,
  ): Promise<LogtoOrganization> {
    if (user.currentOrganization.customData.ownerId === newOwner.id) {
      throw this.exceptions.CANNOT_TRANSFER_TO_YOURSELF;
    }
    if (!user.currentOrganization.customData.adminIds.includes(newOwner.id)) {
      throw this.exceptions.NEW_OWNER_NOT_ADMIN;
    }
    return this.logtoRequests.updateOrganization(user.currentOrganization.id, {
      customData: {
        ownerId: newOwner.id,
        adminIds: user.currentOrganization.customData.adminIds,
      },
    });
  }

  async removeUserFromOrganization(
    user: LogtoUserWithOrganizations,
    userToRemove: LogtoUser,
  ): Promise<LogtoOrganization> {
    if (user.currentOrganization.customData.ownerId === userToRemove.id) {
      throw this.exceptions.CANNOT_REMOVE_OWNER;
    }

    const currentUserRoles = await this.logtoRequests.getUserRoles(
      user.id,
      user.currentOrganization.id,
    );
    if (
      userToRemove.id !== user.id &&
      !currentUserRoles.some((role) => role.name === UserRoleEnum.ADMIN)
    ) {
      throw this.exceptions.NOT_ALLOWED_TO_REMOVE_USER;
    }

    const { members } = await this.logtoRequests.getOrganizationMembers(
      user.currentOrganization.id,
    );
    if (members.length === 1) {
      await this.logtoRequests.deleteOrganization(user.currentOrganization.id);
      return user.currentOrganization;
    }

    if (
      user.currentOrganization.customData.adminIds.includes(userToRemove.id)
    ) {
      await this.logtoRequests.updateOrganization(user.currentOrganization.id, {
        customData: {
          ...user.currentOrganization.customData,
          adminIds: user.currentOrganization.customData.adminIds.filter(
            (id) => id !== userToRemove.id,
          ),
        },
      });
    }
    await this.logtoRequests.removeUserFromOrganization(
      user.currentOrganization.id,
      userToRemove.id,
    );

    return this.logtoRequests.fetchOrganizationInformations(
      user.currentOrganization.id,
    );
  }
}
