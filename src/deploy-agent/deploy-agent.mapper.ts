import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { DocOrLean } from 'src/_utils/types';
import { GetAgentDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { InitProjectResponseDto } from './_utils/dto/responses/init-project-response.dto';
import { DeploymentStatus } from './_utils/types/agent.types';
import { GetSshKeyDto } from './_utils/dto/responses/get-ssh-key.dto';
import { Deployment } from './schemas/deployment.schema';
import { SshKey } from './schemas/ssh-key.schema';

// SSH has no SNI: wrapping it in TLS lets the shared reverse proxy pick the cluster.
const SSH_PROXY_COMMAND =
  'openssl s_client -quiet -verify_return_error -servername %h -connect %h:443';

@Injectable()
export class DeployAgentMapper {
  private readonly sshHost: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.sshHost = configService.get('DEPLOY_AGENT').GIT_SSH_HOST;
  }

  toInitResponse = (
    projectId: string,
    rootCommit: string,
  ): InitProjectResponseDto => ({
    sshPushUrl: `ssh://${projectId}@${this.sshHost}/app/repos/${rootCommit}.git`,
    sshProxyCommand: SSH_PROXY_COMMAND,
  });

  toSshKeyDto = (doc: DocOrLean<SshKey>): GetSshKeyDto => ({
    id: doc._id.toString(),
    title: doc.title,
    fingerprint: doc.fingerprint,
    createdAt: doc.createdAt,
  });

  toAgentDeploymentDto = (
    status: DeploymentStatus,
    doc?: Pick<Deployment, 'branch' | 'serviceName'>,
  ): GetAgentDeploymentDto => ({
    deploymentId: status.id,
    rootCommit: status.repo,
    branch: doc?.branch,
    service: doc?.serviceName,
    commit: status.commit,
    url: `https://${status.host}`,
    status: status.status,
    startedAt: status.startedAt,
  });
}
