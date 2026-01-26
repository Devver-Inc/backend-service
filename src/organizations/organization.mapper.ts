import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnvironmentVariables,
  ServerConfig,
} from 'src/_utils/config/env.config';
import { LogtoInvitation } from 'src/logto/_utils/types/responses/invitation.types';
import {
  LogtoOrganization,
  LogtoOrganizationPermissions,
  LogtoUser,
} from 'src/logto/_utils/types/responses/responses.type';
import { UsersMapper } from 'src/users/user.mapper';
import { OrganizationCustomData } from '../logto/_utils/schemas/logto-organization.schema';
import { UsersPaginatedQueryDto } from '../users/_utils/dto/query/user-paginated-query.dto';
import { GetInvitationDto } from './_utils/dto/responses/get-invitation.dto';
import { GetOrganizationDetailsDto } from './_utils/dto/responses/get-organization-details.dto';
import { GetOrganizationLightDto } from './_utils/dto/responses/get-organization-light.dto';

@Injectable()
export class OrganizationsMapper {
  constructor(
    private readonly usersMapper: UsersMapper,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  toOrganizationLightDtoFromArray = (organizations: LogtoOrganization[]) =>
    Promise.all(organizations.map((org) => this.toOrganizationLightDto(org)));

  toOrganizationLightDto = async (
    organization: LogtoOrganization,
  ): Promise<GetOrganizationLightDto> => ({
    id: organization.id,
    name: organization.name,
    coverImageUrl: organization.branding.logoUrl || null,
  });

  toOrganizationDetailsDto = async (
    organization: LogtoOrganization,
    members: LogtoUser[],
    owner?: LogtoUser | null,
    admins?: LogtoUser[],
  ): Promise<GetOrganizationDetailsDto> => ({
    id: organization.id,
    name: organization.name,
    coverImageUrl: organization.branding.logoUrl || null,
    owner: owner ? this.usersMapper.toUserLightDto(owner) : null,
    admins: admins?.length
      ? admins.map((member) => this.usersMapper.toUserLightDto(member))
      : [],
    membersCount: members.length,
  });

  toInvitationDtoFromArray = (
    invitations: LogtoInvitation[],
  ): GetInvitationDto[] => invitations.map((inv) => this.toInvitationDto(inv));

  toInvitationDto = (
    invitation: LogtoInvitation,
    organizationName?: string,
  ): GetInvitationDto => ({
    id: invitation.id,
    invitee: invitation.invitee,
    inviterId: invitation.inviter || invitation.inviterId || '',
    organizationId: invitation.organizationId,
    organizationName: organizationName || '',
    status: invitation.status,
    createdAt: new Date(invitation.createdAt).toISOString(),
    expiresAt: new Date(invitation.expiresAt).toISOString(),
    organizationRoles: invitation.organizationRoles?.map((x) => x.name) || [],
    message: invitation.messagePayload?.message || invitation.message,
    acceptedAt: invitation.acceptedAt
      ? new Date(invitation.acceptedAt).toISOString()
      : undefined,
  });

  toGetPermissions = (permissions: LogtoOrganizationPermissions): string[] =>
    permissions.map((x) => x.name);

  toGetOrganizationMembersQuery = (
    paginatedQueryDto: UsersPaginatedQueryDto,
  ) => ({
    page: paginatedQueryDto.page,
    page_size: paginatedQueryDto.pageSize,
    ...(paginatedQueryDto.search && { q: paginatedQueryDto.search }),
  });

  toOrganizationCustomDataType = (
    ownerId: string,
    adminIds: string[],
    logoUrl = '',
  ): OrganizationCustomData => ({
    ownerId: ownerId,
    adminIds: [ownerId, ...adminIds],
    logoUrl: logoUrl,
  });
  toGetInvitationLinkUrl = (
    invitation: LogtoInvitation,
    organizationName: string,
  ) => {
    const roles =
      invitation.organizationRoles?.map((role) => role.name).join(',') || '';
    return `${this.configService.get<ServerConfig>('SERVER').FRONTEND_URL}/invitations/join?email=${encodeURIComponent(invitation.invitee)}&organizationName=${encodeURIComponent(organizationName)}&invitationId=${invitation.id}&roles=${encodeURIComponent(roles)}`;
  };
}
