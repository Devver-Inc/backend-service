import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';

export class GetOrganizationDetailsDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'my-organization' })
  name: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/cover.png',
    nullable: true,
  })
  coverImageUrl: string | null;

  @ApiPropertyOptional({ type: () => GetUserLightDto, nullable: true })
  owner: GetUserLightDto | null;

  @ApiProperty({ type: () => GetUserLightDto, isArray: true })
  admins: GetUserLightDto[];

  @ApiProperty({ example: 42 })
  membersCount: number;
}
