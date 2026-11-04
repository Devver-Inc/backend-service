import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrepareReport, RepoServices } from '../../types/deployment.types';

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

  @ApiPropertyOptional({
    description: 'Install command for the whole repo',
    example: 'npm ci',
  })
  install?: string;

  @ApiPropertyOptional({
    description: 'Per-service root and install command',
    example: { web: { root: 'apps/web' }, api: { install: 'pnpm i' } },
  })
  services?: RepoServices;

  @ApiProperty({
    nullable: true,
    description:
      'Last dependency preparation reported by the agent; null when never reported',
    example: {
      status: 'failed',
      commit: '9fceb02d0ae598e95dc970b74767f19372d61af8',
      startedAt: '2024-01-15T10:30:00.000Z',
      finishedAt: '2024-01-15T10:30:20.000Z',
      services: [
        {
          service: 'web',
          root: 'apps/web',
          status: 'failed',
          durationMs: 20000,
          runtime: 'node',
          error: {
            code: 'INSTALL_FAILED',
            message: 'npm ci exited with 1',
            logs: 'npm ERR! ...',
          },
        },
      ],
    },
  })
  lastPrepare: PrepareReport | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}
