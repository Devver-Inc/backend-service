import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { DocOrLean } from 'src/_utils/types';
import { GetAgentDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { DeploymentStatus } from './_utils/types/agent.types';
import { GetSshKeyDto } from './_utils/dto/responses/get-ssh-key.dto';
import { Deployment } from './schemas/deployment.schema';
import { DeployRepo } from './schemas/repo.schema';
import { SshKey } from './schemas/ssh-key.schema';

@Injectable()
export class DeployAgentMapper {
  private readonly sshHost: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.sshHost = configService.get('DEPLOY_AGENT').GIT_SSH_HOST;
  }

  toRepoDto = (doc: DocOrLean<DeployRepo>): GetRepoDto => ({
    id: doc._id.toString(),
    name: doc.name,
    sshPushUrl: `ssh://${doc.projectId}@${this.sshHost}/app/repos/${doc.name}.git`,
    projectId: doc.projectId,
    createdAt: doc.createdAt,
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
    repo: status.repo,
    branch: doc?.branch,
    service: doc?.serviceName,
    commit: status.commit,
    url: `https://${status.host}`,
    status: status.status,
    startedAt: status.startedAt,
  });
}
