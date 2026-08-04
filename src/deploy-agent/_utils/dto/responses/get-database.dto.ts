import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetDatabaseDto {
  @ApiProperty({ example: 'customer-portal' })
  name: string;

  @ApiPropertyOptional({ example: 24576 })
  sizeOnDisk?: number;

  @ApiPropertyOptional({ example: false })
  empty?: boolean;

  @ApiPropertyOptional({ example: 42 })
  keyCount?: number;

  @ApiPropertyOptional({ example: 7 })
  expiringKeyCount?: number;
}
