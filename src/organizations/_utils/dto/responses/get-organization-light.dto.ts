import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetOrganizationLightDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'my-organization' })
  name: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/cover.png',
    nullable: true,
  })
  coverImageUrl: string | null;
}
