import { OrganisationRole } from './organization-role.type'

export interface LogtoInvitation {
  id: string
  invitee: string
  inviter?: string
  inviterId?: string
  organizationId: string
  status: 'Pending' | 'Accepted' | 'Revoked' | 'Expired'
  createdAt: number
  expiresAt: number
  organizationRoles?: OrganisationRole[]
  messagePayload?: {
    message?: string
  }
  message?: string
  acceptedAt?: number
}
