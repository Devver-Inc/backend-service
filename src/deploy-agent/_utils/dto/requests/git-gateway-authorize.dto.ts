import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, Matches, MaxLength } from 'class-validator';
import { REPO_NAME_PATTERN } from '../../constants/validation-patterns';

export class GitGatewayAuthorizeDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  projectId: string;

  @ApiProperty({ example: 'my-repo' })
  @Matches(REPO_NAME_PATTERN, { message: 'INVALID_REPO_NAME' })
  repo: string;

  @ApiProperty({ example: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...' })
  @IsString()
  @MaxLength(16384)
  publicKey: string;
}
