import { BadRequestException, Injectable, mixin, NotFoundException, PipeTransform, Type } from '@nestjs/common'
import { LogtoRequests } from 'src/logto/logto.requests'

export enum LogtoEntityType {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  INVITATION = 'INVITATION',
}

interface LogtoEntityConfig {
  method: keyof LogtoRequests
  entityName: string
  invalidIdMessage: string
  notFoundMessage: string
}

const LOGTO_ENTITY_CONFIGS = new Map<LogtoEntityType, LogtoEntityConfig>([
  [
    LogtoEntityType.USER,
    {
      method: 'fetchUserInformations',
      entityName: 'User',
      invalidIdMessage: 'INVALID_USER_ID',
      notFoundMessage: 'USER_NOT_FOUND',
    },
  ],
  [
    LogtoEntityType.ORGANIZATION,
    {
      method: 'fetchOrganizationInformations',
      entityName: 'Organization',
      invalidIdMessage: 'INVALID_ORGANIZATION_ID',
      notFoundMessage: 'ORGANIZATION_NOT_FOUND',
    },
  ],
  [
    LogtoEntityType.INVITATION,
    {
      method: 'getInvitationById',
      entityName: 'Invitation',
      invalidIdMessage: 'INVALID_INVITATION_ID',
      notFoundMessage: 'INVITATION_NOT_FOUND',
    },
  ],
])

export function LogtoEntityByIdPipe<T>(entityType: LogtoEntityType): Type<PipeTransform<string, Promise<T>>> {
  const config = LOGTO_ENTITY_CONFIGS.get(entityType)

  if (!config) {
    throw new NotFoundException(`Unknown Logto entity type: ${entityType}`)
  }

  @Injectable()
  class MixinLogtoEntityByIdPipe implements PipeTransform<string, Promise<T>> {
    constructor(private readonly logtoRequests: LogtoRequests) {}

    async transform(id: string): Promise<T> {
      if (!id || typeof id !== 'string' || !config) {
        throw new BadRequestException(config?.invalidIdMessage)
      }

      try {
        const fetchMethod = this.logtoRequests[config.method] as (id: string) => Promise<T>
        return await fetchMethod.call(this.logtoRequests, id)
      } catch (error) {
        throw new BadRequestException(config.notFoundMessage, error)
      }
    }
  }

  return mixin(MixinLogtoEntityByIdPipe)
}

export const LogtoUserByIdPipe = LogtoEntityByIdPipe(LogtoEntityType.USER)
export const LogtoOrganizationByIdPipe = LogtoEntityByIdPipe(LogtoEntityType.ORGANIZATION)
export const LogtoInvitationByIdPipe = LogtoEntityByIdPipe(LogtoEntityType.INVITATION)
