import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LOGTO_CLIENT_TOKEN, LOGTO_TENANT_ID } from 'src/_utils/constants';
import { LogtoClient } from 'src/logto/_utils/types/logto.types';
import { LogtoInvitation } from 'src/logto/_utils/types/responses/invitation.types';
import {
  LogtoOrganizationRaw,
  LogtoResponseType,
  LogtoUser,
} from 'src/logto/_utils/types/responses/responses.type';
import { CreateInvitationDto } from 'src/organizations/_utils/dto/requests/create-invitation.dto';
import { UpdateInvitationStatusEnum } from 'src/organizations/_utils/enums/update-invitations-status.enum';
import { OrganizationsMapper } from 'src/organizations/organization.mapper';
import { UpdateAccountDto } from 'src/users/_utils/dto/requests/update-account.dto';
import { LogtoExceptions } from './_utils/errors/logto-exceptions.types';
import {
  toValidatedOrganization,
  toValidatedOrganizations,
  ValidatedOrganization,
} from './_utils/schemas/logto-organization.schema';
import { GetOrganizationMembersQuery } from './_utils/types/requests/get-organization-members-query.types';
import { GetOrganizationQuery } from './_utils/types/requests/get-organizations-query.types';
import {
  CreateOrganizationBody,
  UpdateOrganizationBody,
} from './_utils/types/requests/requests.types';
import { LogtoUserWithOrganizations } from './_utils/types/user-with-organization.type';

@Injectable()
export class LogtoRequests {
  constructor(
    @Inject(LOGTO_CLIENT_TOKEN) private readonly logtoClient: LogtoClient,
    private readonly exceptions: LogtoExceptions,
    private readonly organizationsMapper: OrganizationsMapper,
  ) {}

  /**
   * GET /api/users/{userId}
   * Fetch user information by user ID.
   * @link https://openapi.logto.io/operation/operation-getuser
   * @param userId
   * @returns User information
   */
  fetchUserInformations = (userId: string) =>
    this.handleResponse(
      this.logtoClient.GET('/api/users/{userId}', {
        params: {
          path: { userId: userId },
        },
      }),
      this.exceptions.ERROR_FETCH_USER_INFORMATIONS,
    );

  /**
   * Safely fetch user information by user ID.
   * Returns null if the user does not exist or an error occurs.
   * @param userId
   * @returns User information or null
   */
  fetchUserSafe = async (userId: string) => {
    try {
      return await this.fetchUserInformations(userId);
    } catch {
      return null;
    }
  };

  /**
   * POST /api/users/{userId}/password/verify
   * Verify user password.
   * @link https://openapi.logto.io/operation/operation-verifyuserpassword
   * @param userId
   * @param password
   * @returns Success response
   */
  verifyUserPassword = (userId: string, password: string) =>
    this.handleResponse(
      this.logtoClient.POST('/api/users/{userId}/password/verify', {
        params: {
          path: { userId: userId },
        },
        body: {
          password,
        },
      }),
      this.exceptions.ERROR_VERIFY_USER_PASSWORD,
    );

  /**
   * PATCH /api/users/{userId}/password
   * Update user password.
   * @link https://openapi.logto.io/operation/operation-updateuserpassword
   * @param userId
   * @param password
   * @returns Success response
   */
  updateUserPassword = (userId: string, password: string) =>
    this.handleResponse(
      this.logtoClient.PATCH('/api/users/{userId}/password', {
        params: {
          path: { userId: userId },
        },
        body: {
          password,
        },
      }),
      this.exceptions.ERROR_UPDATE_USER_PASSWORD,
    );

  /**
   * GET /api/organizations
   * Get organizations that match the given query with pagination.
   * @link https://openapi.logto.io/operation/operation-listorganizations
   * @param query
   * @returns Logto user
   */
  getOrganizations = (query?: GetOrganizationQuery) =>
    this.handleOrganizationResponse(
      this.logtoClient.GET('/api/organizations', {
        params: {
          query,
        },
      }),
    );

  /**
   * POST /api/organizations
   * Create a new organization.
   * @link https://openapi.logto.io/operation/operation-createorganization
   * @param params
   * @returns Created organization
   */
  createOrganization = (params: CreateOrganizationBody) =>
    this.handleOrganizationResponse(
      this.logtoClient.POST('/api/organizations', {
        body: {
          tenantId: LOGTO_TENANT_ID,
          name: params.name,
          description: params.description,
          // Logto's generated types restrict organization custom data to Record<string, never>
          // so we need to cast our richer structure here before sending it to the API
          customData: params.customData as unknown as Record<string, never>,
          isMfaRequired: params.isMfaRequired,
          color: params.color,
          branding: params.branding,
          customCss: params.customCss,
          createdAt: params.createdAt,
        },
      }),
      this.exceptions.ERROR_CREATE_ORGANIZATION,
    );

  /**
   * PATCH /api/organizations/{id}
   * Update an organization.
   * @link https://openapi.logto.io/operation/operation-updateorganization
   * @param organizationId
   * @param params
   * @returns Updated organization
   */
  updateOrganization = (
    organizationId: string,
    params: UpdateOrganizationBody,
  ) =>
    this.handleOrganizationResponse(
      this.logtoClient.PATCH('/api/organizations/{id}', {
        params: { path: { id: organizationId } },
        body: {
          ...params,
          ...(params.customData !== undefined && {
            // Logto's generated types restrict organization custom data to Record<string, never>
            // so we need to cast our richer structure here before sending it to the API
            customData: params.customData as unknown as Record<string, never>,
          }),
        } as any,
      }),
    );

  /**
   * DELETE /api/organizations/{id}
   * Delete an organization.
   * @link https://openapi.logto.io/operation/operation-deleteorganization
   * @param organizationId
   * @returns void (204 status)
   */
  deleteOrganization = (organizationId: string) =>
    this.handleResponse(
      this.logtoClient.DELETE('/api/organizations/{id}', {
        params: { path: { id: organizationId } },
      }),
      this.exceptions.ERROR_DELETE_ORGANIZATION,
    );

  /**
   * GET /api/organization-roles
   * Get all organization roles.
   * @link https://openapi.logto.io/operation/operation-listorganizationroles
   * @returns Organization roles
   */
  getOrganizationsRoles = () =>
    this.handleResponse(this.logtoClient.GET('/api/organization-roles'));

  /**
   * GET /api/organizations/{id}/users/{userId}/roles
   * Get user roles in an organization.
   * @link https://openapi.logto.io/operation/operation-getorganizationuserroles
   * @param userId
   * @param organizationId
   * @returns User roles
   */
  getUserRoles = (userId: string, organizationId: string) =>
    this.handleResponse(
      this.logtoClient.GET('/api/organizations/{id}/users/{userId}/roles', {
        params: { path: { id: organizationId, userId: userId } },
      }),
    );

  /**
   * GET /api/users/{userId}/organizations
   * Get organizations for a user.
   * @link https://openapi.logto.io/operation/operation-listuserorganizations
   * @param userId
   * @returns User organizations
   */
  getUserOrganizations = (userId: string) =>
    this.handleResponse(
      this.logtoClient.GET('/api/users/{userId}/organizations', {
        params: { path: { userId: userId } },
      }),
    );

  /**
   * GET /api/organizations/{id}/users/{userId}/scopes
   * Get current user permissions in an organization.
   * @link https://openapi.logto.io/operation/operation-getorganizationuserscopes
   * @param user
   * @returns User permissions
   */
  getCurrentUserPermissions = (userId: string, organizationId: string) =>
    this.handleResponse(
      this.logtoClient.GET('/api/organizations/{id}/users/{userId}/scopes', {
        params: { path: { id: organizationId, userId: userId } },
      }),
    );

  /**
   * GET /api/organization-invitations
   * Get invitations for a specific user by email.
   * @link https://openapi.logto.io/operation/operation-listorganizationinvitations
   * @param email
   * @returns User invitations
   */
  getUserInvitations = (email: string): Promise<LogtoInvitation[]> =>
    this.handleResponse(
      this.logtoClient.GET('/api/organization-invitations', {
        params: {
          query: { invitee: email },
        },
      }) as Promise<LogtoResponseType<LogtoInvitation[]>>,
      this.exceptions.ERROR_GET_INVITATIONS,
    );

  /**
   * POST /api/organization-invitations
   * Create a new organization invitation.
   * @link https://openapi.logto.io/operation/operation-createorganizationinvitation
   * @param user
   * @param params
   * @returns Created invitation
   */
  createOrganizationInvitation = (
    user: LogtoUserWithOrganizations,
    params: CreateInvitationDto,
  ): Promise<LogtoInvitation> => {
    if (!user.currentOrganization) {
      throw new BadRequestException(
        'User must belong to an organization to create invitations',
      );
    }

    const expiresAt = params.expiresInHours
      ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000).getTime()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime();

    return this.handleResponse<LogtoInvitation>(
      this.logtoClient.POST('/api/organization-invitations', {
        body: {
          invitee: params.invitee,
          inviterId: user.id,
          organizationId: user.currentOrganization.id,
          expiresAt,
          organizationRoleIds: params.organizationRoleIds,
          messagePayload: false,
        },
      }) as Promise<LogtoResponseType<LogtoInvitation>>,
      this.exceptions.ERROR_CREATE_INVITATION,
    );
  };

  resendInvitationMessage = (
    invitation: LogtoInvitation,
    organizationName: string,
  ): Promise<LogtoInvitation> => {
    return this.handleResponse<LogtoInvitation>(
      this.logtoClient.POST('/api/organization-invitations/{id}/message', {
        params: {
          path: { id: invitation.id },
        },
        body: {
          link: this.organizationsMapper.toGetInvitationLinkUrl(
            invitation,
            organizationName,
          ),
        },
      }),
      this.exceptions.ERROR_CREATE_INVITATION,
    );
  };

  /**
   * GET /api/organization-invitations/{id}
   * Get an invitation by ID.
   * @link https://openapi.logto.io/operation/operation-getorganizationinvitation
   * @param invitationId
   * @returns Invitation details
   */
  getInvitationById = (invitationId: string): Promise<LogtoInvitation> =>
    this.handleResponse<LogtoInvitation>(
      this.logtoClient.GET('/api/organization-invitations/{id}', {
        params: {
          path: {
            id: invitationId,
          },
        },
      }) as Promise<LogtoResponseType<LogtoInvitation>>,
      this.exceptions.ERROR_GET_INVITATIONS,
    );

  /**
   * GET /api/organization-invitations
   * Get all invitations for an organization.
   * @link https://openapi.logto.io/operation/operation-listorganizationinvitations
   * @param organizationId
   * @returns Organization invitations
   */
  getOrganizationInvitations = (
    organizationId: string,
  ): Promise<LogtoInvitation[]> =>
    this.handleResponse<LogtoInvitation[]>(
      this.logtoClient.GET('/api/organization-invitations', {
        params: {
          query: { organizationId },
        },
      }) as Promise<LogtoResponseType<LogtoInvitation[]>>,
      this.exceptions.ERROR_GET_INVITATIONS,
    );

  /**
   * PUT /api/organization-invitations/{id}/status
   * Update an organization invitation status (Accept or Revoke).
   * @link https://openapi.logto.io/operation/operation-replaceorganizationinvitationstatus
   * @param invitationId
   * @param status
   * @param userId
   * @returns Success response
   */
  updateOrganizationInvitationStatus = (
    invitationId: string,
    status: UpdateInvitationStatusEnum,
    userId?: string,
  ): Promise<LogtoInvitation> =>
    this.handleResponse<LogtoInvitation>(
      this.logtoClient.PUT('/api/organization-invitations/{id}/status', {
        params: {
          path: { id: invitationId },
        },
        body: {
          status,
          ...(userId && { acceptedUserId: userId }),
        },
      }) as Promise<LogtoResponseType<LogtoInvitation>>,
      this.exceptions.ERROR_ACCEPT_INVITATION,
    );

  /**
   * GET /api/organizations/{id}
   * Fetch organization information by organization ID.
   * @link https://openapi.logto.io/operation/operation-getorganization
   * @param organizationId
   * @returns Organization information
   */
  fetchOrganizationInformations = (organizationId: string) =>
    this.handleOrganizationResponse(
      this.logtoClient.GET('/api/organizations/{id}', {
        params: {
          path: { id: organizationId },
        },
      }),
    );

  updateUserProfile = (userId: string, dto: UpdateAccountDto) =>
    this.handleResponse(
      this.logtoClient.PATCH('/api/users/{userId}/profile', {
        params: {
          path: { userId: userId },
        },
        body: {
          profile: {
            familyName: dto.lastName,
            givenName: dto.firstName,
          },
        },
      }),
      this.exceptions.ERROR_UPDATE_USER_PROFILE,
    );

  updateUserProfilePicture = (userId: string, profilePictureUrl: string) =>
    this.handleResponse(
      this.logtoClient.PATCH('/api/users/{userId}', {
        params: {
          path: { userId: userId },
        },
        body: {
          avatar: profilePictureUrl,
        },
      }),
      this.exceptions.ERROR_UPDATE_USER_PROFILE,
    );

  /**
   * GET /api/organizations/{id}/users
   * Get organization members.
   * @link https://openapi.logto.io/operation/operation-listorganizationusers
   * @param organizationId
   * @returns Organization members
   */
  getOrganizationMembers = async (
    organizationId: string,
    query?: GetOrganizationMembersQuery,
  ): Promise<{ members: LogtoUser[]; totalItemsCount: number }> =>
    this.fetchOrganizationMembers(organizationId, query);

  /**
   * POST /api/organizations/{id}/users
   * Add users to organization.
   * @link https://openapi.logto.io/operation/operation-addorganizationusers
   * @param organizationId
   * @param userIds
   * @returns Success response
   */
  addUsersToOrganization = (organizationId: string, userIds: string[]) =>
    this.handleResponse(
      this.logtoClient.POST('/api/organizations/{id}/users', {
        params: { path: { id: organizationId } },
        body: { userIds: userIds },
      }),
      this.exceptions.ERROR_ADD_USERS_TO_ORGANIZATION,
    );

  /**
   * POST /api/organizations/{id}/users/roles
   * Assign roles to organization members.
   * @link https://openapi.logto.io/operation/operation-assignorganizationrolestousers
   * @param organizationId
   * @param userIds
   * @param roleIds
   * @returns Success response
   */
  assignRolesToOrganizationMembers = (
    organizationId: string,
    userIds: string[],
    roleIds: string[],
  ) =>
    this.handleResponse(
      this.logtoClient.POST('/api/organizations/{id}/users/roles', {
        params: { path: { id: organizationId } },
        body: { userIds: userIds, organizationRoleIds: roleIds },
      }),
      this.exceptions.ERROR_ASSIGN_ROLES_ORGANIZATION_MEMBERS,
    );

  /**
   * POST /api/organizations/{id}/jit/roles
   * Add JIT default roles to organization.
   * @link https://openapi.logto.io/operation/operation-createorganizationjitrole
   * @param organizationId
   * @param roleIds
   * @returns Success response
   */
  addOrganizationJitDefaultRoles = (
    organizationId: string,
    roleIds: string[],
  ) =>
    this.handleResponse(
      this.logtoClient.POST('/api/organizations/{id}/jit/roles', {
        params: { path: { id: organizationId } },
        body: { organizationRoleIds: roleIds },
      }),
      this.exceptions.ERROR_ADD_ORGANIZATION_JIT_DEFAULT_ROLES,
    );

  /**
   * POST /api/organizations/{id}/jit/email-domains
   * Add JIT email domain to organization.
   * @link https://openapi.logto.io/operation/operation-createorganizationjitemaildomain
   * @param organizationId
   * @param domain
   * @returns Success response
   */
  addOrganizationJitEmailDomain = (organizationId: string, domain: string) =>
    this.handleResponse(
      this.logtoClient.POST('/api/organizations/{id}/jit/email-domains', {
        params: { path: { id: organizationId } },
        body: { emailDomain: domain },
      }),
    );

  /**
   * DELETE /api/organizations/{id}/users/{userId}
   * Remove a user from an organization.
   * @link https://openapi.logto.io/operation/operation-removeorganizationuser
   * @param organizationId
   * @param userId
   * @returns Success response
   */
  removeUserFromOrganization = (organizationId: string, userId: string) =>
    this.handleResponse(
      this.logtoClient.DELETE('/api/organizations/{id}/users/{userId}', {
        params: { path: { id: organizationId, userId: userId } },
      }),
    );

  private fetchOrganizationMembers = async (
    organizationId: string,
    query?: GetOrganizationMembersQuery,
  ): Promise<{ members: LogtoUser[]; totalItemsCount: number }> => {
    const res = await this.logtoClient.GET('/api/organizations/{id}/users', {
      params: {
        path: { id: organizationId },
        ...(query && { query }),
      },
    });

    const members = this.resOrThrow<LogtoUser[]>(res);
    const totalItemsCountHeader = res.response?.headers?.get('x-total-count');
    const totalItemsCount = totalItemsCountHeader
      ? Number(totalItemsCountHeader)
      : members.length;

    return {
      members,
      totalItemsCount: Number.isFinite(totalItemsCount)
        ? totalItemsCount
        : members.length,
    };
  };

  private handleResponse = <T>(
    promise: Promise<LogtoResponseType<T>>,
    error?: BadRequestException | InternalServerErrorException,
  ): Promise<T> =>
    promise
      .then((res) => this.resOrThrow(res, error))
      .catch((err) => {
        if (
          err.message?.includes('Unexpected token') &&
          (err.message?.includes('Created') || err.message?.includes('"C"'))
        ) {
          return { success: true } as T;
        }
        throw error || err;
      });

  private async handleOrganizationResponse(
    promise: Promise<LogtoResponseType<LogtoOrganizationRaw>>,
    error?: BadRequestException | InternalServerErrorException,
  ): Promise<ValidatedOrganization>;
  private async handleOrganizationResponse(
    promise: Promise<LogtoResponseType<LogtoOrganizationRaw[]>>,
    error?: BadRequestException | InternalServerErrorException,
  ): Promise<Array<ValidatedOrganization>>;
  private async handleOrganizationResponse(
    promise: Promise<
      LogtoResponseType<LogtoOrganizationRaw | LogtoOrganizationRaw[]>
    >,
    error?: BadRequestException | InternalServerErrorException,
  ): Promise<unknown> {
    return this.handleResponse(promise, error).then((data) => {
      if (Array.isArray(data)) {
        return toValidatedOrganizations(data);
      }
      return toValidatedOrganization(data);
    });
  }

  private resOrThrow = <T>(
    res: LogtoResponseType<T>,
    error?: BadRequestException | InternalServerErrorException,
  ): T => {
    if (
      res.response &&
      res.response.status >= 200 &&
      res.response.status < 300
    ) {
      return res.data || ({ success: true } as T);
    }

    if (res.response?.status) {
      const status = res.response.status;
      const errorMessage = error?.message || 'Request failed';

      switch (status) {
        case 400:
          throw new BadRequestException(errorMessage);
        case 401:
          throw new UnauthorizedException(errorMessage);
        case 403:
          throw new ForbiddenException(errorMessage);
        case 404:
          throw new NotFoundException(errorMessage);
        case 409:
          throw new BadRequestException(errorMessage);
        default:
          if (status >= 500) {
            throw new InternalServerErrorException(errorMessage);
          }
      }
    }

    if (!res.data) {
      throw error || this.exceptions.DEFAULT_LOGTO_ERROR;
    }
    return res.data;
  };
}
