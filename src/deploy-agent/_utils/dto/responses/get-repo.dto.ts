import { ApiProperty } from '@nestjs/swagger';

export class GetRepoDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({
    description: 'Generated; what deployments reference as `repo`',
    example: 'r7k2m9qx',
  })
  name: string;

  @ApiProperty({ example: 'shop-web' })
  displayName: string;

  @ApiProperty({ example: '9fceb02d0ae598e95dc970b74767f19372d61af8' })
  rootCommit: string;

  @ApiProperty({
    example:
      'ssh://6650a1b2c3d4e5f6a7b8c9d0@git.vr27-dev.devver.app/app/repos/r7k2m9qx.git',
  })
  sshPushUrl: string;

  @ApiProperty({
    description:
      'ProxyCommand that git/ssh must use to reach sshPushUrl (SSH wrapped in TLS on 443).',
    example:
      'openssl s_client -quiet -verify_return_error -servername %h -connect %h:443',
  })
  sshProxyCommand: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  projectId: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}
