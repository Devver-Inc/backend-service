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

  /** The backend's record, with a ready one checked against the agent's process. */
  toAgentDeploymentDto = (
    doc: DocOrLean<Deployment>,
    process?: DeploymentStatus,
  ): GetAgentDeploymentDto => {
    const status =
      doc.status !== 'ready'
        ? doc.status
        : process?.status === 'running'
          ? 'ready'
          : process?.status === 'stopped'
            ? 'stopped'
            : 'degraded';
    return {
      deploymentId: doc.deploymentId,
      rootCommit: doc.repo,
      commit: doc.commit,
      parentDeploymentId: doc.parentDeploymentId ?? null,
      secondParentDeploymentId: doc.secondParentDeploymentId ?? null,
      displayName: doc.displayName ?? null,
      service: doc.serviceName,
      status,
      stage: doc.stage ?? null,
      url: status === 'ready' ? `https://${doc.host}` : null,
      createdAt: doc.createdAt,
    };
  };
}
