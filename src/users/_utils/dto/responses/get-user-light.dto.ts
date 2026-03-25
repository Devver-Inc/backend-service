import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetUserLightDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'johndoe@example.com' })
  email: string | null;

  @ApiPropertyOptional({ example: 'John Doe', nullable: true })
  name: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatar.png',
    nullable: true,
  })
  avatarUrl: string | null;
}
