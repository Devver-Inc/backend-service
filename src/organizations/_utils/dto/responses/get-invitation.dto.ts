import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetInvitationDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'invitee@example.com' })
  invitee: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  inviterId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439013' })
  organizationId: string;

  @ApiProperty({ example: 'my-organization' })
  organizationName: string;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-02-15T10:30:00.000Z' })
  expiresAt: string;

  @ApiProperty({ example: ['member', 'admin'], isArray: true, type: String })
  organizationRoles: string[];

  @ApiPropertyOptional({ example: 'Welcome to the team!' })
  message?: string;

  @ApiPropertyOptional({ example: '2024-01-16T10:30:00.000Z' })
  acceptedAt?: string;
}
