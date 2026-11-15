import { ApiProperty } from '@nestjs/swagger';

export class InitProjectResponseDto {
  @ApiProperty({
    example:
      'ssh://6650a1b2c3d4e5f6a7b8c9d0@git.vr27-dev.devver.app/app/repos/9fceb02d0ae598e95dc970b74767f19372d61af8.git',
  })
  sshPushUrl: string;

  @ApiProperty({
    description:
      'ProxyCommand that git/ssh must use to reach sshPushUrl (SSH wrapped in TLS on 443).',
    example:
      'openssl s_client -quiet -verify_return_error -servername %h -connect %h:443',
  })
  sshProxyCommand: string;
}
