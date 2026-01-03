export class GetInvitationDto {
  id: string
  invitee: string
  inviterId: string
  organizationId: string
  organizationName: string
  status: string
  createdAt: string
  expiresAt: string
  organizationRoles: string[]
  message?: string
  acceptedAt?: string
}
