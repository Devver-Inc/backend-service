import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, MaxLength } from 'class-validator';

export class GitGatewayAuthorizeDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  projectId: string;

  @ApiProperty({ example: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...' })
  @IsString()
  @MaxLength(16384)
  publicKey: string;
}
