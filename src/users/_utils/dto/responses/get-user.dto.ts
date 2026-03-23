import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GetOrganizationLightDto } from 'src/organizations/_utils/dto/responses/get-organization-light.dto';

export class GetUserDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatar.png',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiPropertyOptional({ type: () => GetOrganizationLightDto, nullable: true })
  organization: GetOrganizationLightDto | null;

  @ApiProperty({ example: 1705315800000 })
  lastSignInAt: number;

  @ApiProperty({ example: true })
  hasPassword: boolean;
}
