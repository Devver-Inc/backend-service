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
  LogtoOrganizationMember,
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

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 10_000;

@Injectable()
export class LogtoRequests {
  // Per replica: another replica may serve 60 s stale data after a write.
  private readonly cache = new Map<
    string,
    { value: Promise<unknown>; expiresAt: number }
  >();

  constructor(
    @Inject(LOGTO_CLIENT_TOKEN) private readonly logtoClient: LogtoClient,
    private readonly exceptions: LogtoExceptions,
    private readonly organizationsMapper: OrganizationsMapper,
  ) {}

  fetchUserInformations = (userId: string) =>
    this.handleResponse(
      this.logtoClient.GET('/api/users/{userId}', {
        params: {
          path: { userId: userId },
        },
      }),
      this.exceptions.ERROR_FETCH_USER_INFORMATIONS,
    );

  /** Null on any error, a missing user included. */
  fetchUserSafe = async (userId: string) => {
    try {
      return await this.fetchUserInformations(userId);
    } catch {
      return null;
    }
  };

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

  getOrganizations = (query?: GetOrganizationQuery) =>
    this.handleOrganizationResponse(
      this.logtoClient.GET('/api/organizations', {
        params: {
          query,
        },
      }),
    );

  createOrganization = (params: CreateOrganizationBody) =>
    this.handleOrganizationResponse(
      this.logtoClient.POST('/api/organizations', {
        body: {
          tenantId: LOGTO_TENANT_ID,
          name: params.name,
          description: params.description,
          // Logto types customData as Record<string, never>.
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

  updateOrganization = (
    organizationId: string,
    params: UpdateOrganizationBody,
  ) =>
    this.forget(
      `org:${organizationId}`,
      this.handleOrganizationResponse(
        this.logtoClient.PATCH('/api/organizations/{id}', {
          params: { path: { id: organizationId } },
          body: {
            ...params,
            ...(params.customData !== undefined && {
              customData: params.customData as unknown as Record<string, never>,
            }),
          } as any,
        }),
      ),
    );

  deleteOrganization = (organizationId: string) =>
    this.forget(
      `org:${organizationId}`,
      this.handleResponse(
        this.logtoClient.DELETE('/api/organizations/{id}', {
          params: { path: { id: organizationId } },
        }),
        this.exceptions.ERROR_DELETE_ORGANIZATION,
      ),
    );

  getOrganizationsRoles = () =>
    this.handleResponse(this.logtoClient.GET('/api/organization-roles'));

  getUserRoles = (userId: string, organizationId: string) =>
    this.handleResponse(
      this.logtoClient.GET('/api/organizations/{id}/users/{userId}/roles', {
        params: { path: { id: organizationId, userId: userId } },
      }),
    );

  getUserOrganizations = (userId: string) =>
    this.handleResponse(
      this.logtoClient.GET('/api/users/{userId}/organizations', {
        params: { path: { userId: userId } },
      }),
    );

  getUserInvitations = (email: string): Promise<LogtoInvitation[]> =>
    this.handleResponse(
      this.logtoClient.GET('/api/organization-invitations', {
        params: {
          query: { invitee: email },
        },
      }) as Promise<LogtoResponseType<LogtoInvitation[]>>,
      this.exceptions.ERROR_GET_INVITATIONS,
    );

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

  fetchUserCached = (userId: string) =>
    this.cached(`user:${userId}`, () => this.fetchUserInformations(userId));

  fetchOrganizationCached = (organizationId: string) =>
    this.cached(`org:${organizationId}`, () =>
      this.fetchOrganizationInformations(organizationId),
    );

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;
    if (this.cache.size >= CACHE_MAX_ENTRIES) this.cache.clear();

    const value = load();
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    value.catch(() => this.cache.delete(key));
    return value;
  }

  private forget = <T>(key: string, write: Promise<T>): Promise<T> =>
    write.finally(() => this.cache.delete(key));

  fetchOrganizationInformations = (organizationId: string) =>
    this.handleOrganizationResponse(
      this.logtoClient.GET('/api/organizations/{id}', {
        params: {
          path: { id: organizationId },
        },
      }),
    );

  updateUserProfile = (userId: string, dto: UpdateAccountDto) =>
    this.forget(
      `user:${userId}`,
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
      ),
    );

  updateUserProfilePicture = (
    userId: string,
    profilePictureUrl: string | null,
  ) =>
    this.forget(
      `user:${userId}`,
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
      ),
    );

  getOrganizationMembers = async (
    organizationId: string,
    query?: GetOrganizationMembersQuery,
  ): Promise<{ members: LogtoUser[]; totalItemsCount: number }> =>
    this.fetchOrganizationMembers(organizationId, query);

  addUsersToOrganization = (organizationId: string, userIds: string[]) =>
    this.handleResponse(
      this.logtoClient.POST('/api/organizations/{id}/users', {
        params: { path: { id: organizationId } },
        body: { userIds: userIds },
      }),
      this.exceptions.ERROR_ADD_USERS_TO_ORGANIZATION,
    );

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

  addOrganizationJitEmailDomain = (organizationId: string, domain: string) =>
    this.handleResponse(
      this.logtoClient.POST('/api/organizations/{id}/jit/email-domains', {
        params: { path: { id: organizationId } },
        body: { emailDomain: domain },
      }),
    );

  removeUserFromOrganization = (organizationId: string, userId: string) =>
    this.handleResponse(
      this.logtoClient.DELETE('/api/organizations/{id}/users/{userId}', {
        params: { path: { id: organizationId, userId: userId } },
      }),
    );

  getAllOrganizationMembers = async (
    organizationId: string,
  ): Promise<LogtoOrganizationMember[]> => {
    const pageSize = 100;
    const all: LogtoOrganizationMember[] = [];
    for (let page = 1; ; page++) {
      const { members } = await this.fetchOrganizationMembers(organizationId, {
        page,
        page_size: pageSize,
      });
      all.push(...(members as LogtoOrganizationMember[]));
      if (members.length < pageSize) return all;
    }
  };

  /**
   * The work org of an email domain, marked by customData.workDomain: its
   * name is free, any org may be renamed to the domain. Orgs created before
   * the mark are recognised by the name and description they were given.
   */
  findWorkOrganization = (domain: string) =>
    this.getOrganizations({ q: domain, page_size: 100 }).then((orgs) =>
      orgs.find(
        (org) =>
          org.customData.workDomain === domain ||
          (!org.customData.workDomain &&
            org.name === domain &&
            org.description === `${domain} professional Organization`),
      ),
    );

  updateUserCustomData = (
    userId: string,
    customData: Record<string, unknown>,
  ) =>
    this.forget(
      `user:${userId}`,
      this.handleResponse(
        this.logtoClient.PATCH('/api/users/{userId}/custom-data', {
          params: { path: { userId } },
          // Same customData cast as createOrganization.
          body: { customData: customData as Record<string, never> },
        }),
      ),
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
