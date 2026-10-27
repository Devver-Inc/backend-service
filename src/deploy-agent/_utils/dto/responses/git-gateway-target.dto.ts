import { ApiProperty } from '@nestjs/swagger';

export class GitGatewayTargetDto {
  @ApiProperty({ example: 'acme' })
  organization: string;

  @ApiProperty({ example: 'loja' })
  project: string;
}
