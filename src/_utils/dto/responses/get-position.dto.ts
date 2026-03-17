import { ApiProperty } from '@nestjs/swagger';

export class GetPositionDto {
  @ApiProperty({ example: 'https://app.example.com/page' })
  pageUrl: string;

  @ApiProperty({ example: '#section-1' })
  anchor: string;

  @ApiProperty({ example: 0.42 })
  normX: number;

  @ApiProperty({ example: 0.75 })
  normY: number;

  @ApiProperty({ example: 12 })
  anchorOffsetX: number;

  @ApiProperty({ example: 34 })
  anchorOffsetY: number;
}
