import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetProjectLightDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'my-project' })
  name: string;

  @ApiPropertyOptional({
    example: 'A short project description',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}
