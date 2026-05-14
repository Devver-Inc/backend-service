import { ApiProperty } from '@nestjs/swagger';

export class GetMongoDatabaseDto {
  @ApiProperty({ example: 'customer-portal' })
  name: string;

  @ApiProperty({ example: 24576 })
  sizeOnDisk: number;

  @ApiProperty({ example: false })
  empty: boolean;
}
