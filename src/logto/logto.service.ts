import { IncomingHttpHeaders } from 'node:http'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { jwtVerify } from 'jose'
import { BEARER_PREFIX, LOGTO_JWKS_TOKEN, LOGTO_URIS_TOKEN } from 'src/_utils/constants'
import { PERSONAL_EMAIL_DOMAINS } from 'src/logto/_utils/constants/domains'
import { AuthorizationError } from 'src/logto/_utils/errors/authorization-error.types'
import { AuthInfo } from 'src/logto/_utils/types/auth-info.types'
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type'
import { UpdateUserPasswordDto } from 'src/users/_utils/dto/requests/update-user-password.dto'
import { OrganizationsMapper } from '../organizations/organization.mapper'
import { decodeLogtoPayload, LogtoPayload } from './_utils/schemas/logto-payload.types'
import { Jwks, JwksUris } from './_utils/types/jwks-set.types'
import { LogtoRolesEnum, RoleTypeEnum } from './_utils/types/roles.type'
import { LogtoMapper } from './logto.mapper'
import { LogtoRequests } from './logto.requests'

@Injectable()
export class LogtoService {
  constructor(
    private readonly logtoRequests: LogtoRequests,
    private readonly logtoMapper: LogtoMapper,
    private readonly organizationsMapper: OrganizationsMapper,
    @Inject(LOGTO_JWKS_TOKEN) private readonly jwks: Jwks,
    @Inject(LOGTO_URIS_TOKEN) private readonly logtoUris: JwksUris,
  ) {}

  getUserInformations = (id: string) => this.logtoRequests.fetchUserInformations(id)
  getOrganizationInformations = (id: string) => this.logtoRequests.fetchOrganizationInformations(id)

  extractBearerTokenFromHeaders({ authorization }: IncomingHttpHeaders): string {
    if (!authorization) {
      throw new AuthorizationError('Authorization header is missing', 401)
    }

    if (!authorization.startsWith(BEARER_PREFIX)) {
      throw new AuthorizationError(`Authorization header must start with "${BEARER_PREFIX}"`, 401)
    }

    return authorization.slice(BEARER_PREFIX.length)
  }

  async validateJwt(token: string): Promise<LogtoPayload> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.logtoUris.issuerUri,
    })

    return decodeLogtoPayload(payload)
  }

  async createAuthInfo(payload: LogtoPayload): Promise<AuthInfo> {
    const sub = payload.sub
    if (!sub) throw new BadRequestException('Invalid Payload')
    const user = await this.getUserInformations(payload.sub)
    const selectedOrganization = payload.organization_id
      ? await this.getOrganizationInformations(payload.organization_id)
      : null
    return this.logtoMapper.toAuthInfo(payload, user, selectedOrganization)
  }

  private getProfessionalUserEmailOrNull(email: string): string | null {
    const domain = email.toLowerCase().split('@')[1]
    return PERSONAL_EMAIL_DOMAINS.includes(domain) ? null : domain
  }

  async manageUserWithoutOrganization(user: LogtoUser) {
    const adminRoleId = await this.getRoleIdsForRoleNames(LogtoRolesEnum.ADMIN)

    await this.createOrganizationIfNotExistsAndAssignUserWithRoles(
      user,
      `${user.id}'s Organization`,
      `${user.id}'s personal Organization`,
      adminRoleId,
    )
    const professionalDomain = this.getProfessionalUserEmailOrNull(user.primaryEmail ?? '')
    if (professionalDomain) {
      const domainName = professionalDomain.split('.')[0]
      const professionalOrganization = await this.createOrganizationIfNotExistsAndAssignUserWithRoles(
        user,
        `${domainName}`,
        `${domainName} professional Organization`,
        adminRoleId,
      )

      if (professionalOrganization)
        await this.logtoRequests.addOrganizationJitEmailDomain(professionalOrganization.id, professionalDomain)
    }
  }

  async createOrganizationIfNotExistsAndAssignUserWithRoles(
    user: LogtoUser,
    organizationName: string,
    organizationDescription: string,
    roles: string[] = [],
  ) {
    const organizations = await this.logtoRequests.getOrganizations()
    const organizationWithNameAlreadyExists = organizations?.some((org) => org.name === organizationName)
    if (organizationWithNameAlreadyExists) return
    const newOrganization = await this.logtoRequests.createOrganization({
      name: organizationName,
      description: organizationDescription,
      customData: this.organizationsMapper.toOrganizationCustomDataType(user.id, [user.id]),
    })

    const roleIds = await this.getRoleIdsForRoleNames(LogtoRolesEnum.BASIC)

    await this.logtoRequests.addOrganizationJitDefaultRoles(newOrganization.id, roleIds)
    await this.logtoRequests.addUsersToOrganization(newOrganization.id, [user.id])
    await this.logtoRequests.assignRolesToOrganizationMembers(newOrganization.id, [user.id], roles)
    return newOrganization
  }

  private async getRoleIdsForRoleNames(...roleNames: LogtoRolesEnum[]): Promise<string[]> {
    const roles = await this.logtoRequests.getOrganizationsRoles()

    const roleIds = roleNames.map((roleName) => {
      const role = roles.find((role) => role.name === roleName && role.type === RoleTypeEnum.USER)
      if (!role) throw new Error(`Role not found: ${roleName}`)
      return role.id
    })

    return roleIds
  }

  async updateUserPassword(user: LogtoUser, updateUserPasswordDto: UpdateUserPasswordDto) {
    if (user.hasPassword && !updateUserPasswordDto.oldPassword) {
      throw new BadRequestException('Old password is required')
    }

    if (user.hasPassword && updateUserPasswordDto.oldPassword) {
      const isPasswordValid = await this.logtoRequests.verifyUserPassword(user.id, updateUserPasswordDto.oldPassword)
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid old password')
      }
    }

    return this.logtoRequests.updateUserPassword(user.id, updateUserPasswordDto.newPassword)
  }
}
