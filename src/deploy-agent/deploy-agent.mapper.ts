import { Injectable } from '@nestjs/common';
import { DocOrLean } from 'src/_utils/types';
import { GetAgentDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { AgentDeploymentListItem } from './_utils/types/agent.types';
import { GetSshKeyDto } from './_utils/dto/responses/get-ssh-key.dto';
import { DeployRepo } from './schemas/repo.schema';
import { SshKey } from './schemas/ssh-key.schema';

@Injectable()
export class DeployAgentMapper {
  toRepoDto = (doc: DocOrLean<DeployRepo>): GetRepoDto => ({
    id: doc._id.toString(),
    name: doc.name,
    pushUrl: doc.pushUrl,
    sshPushUrl: doc.sshPushUrl,
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
    result: AgentDeploymentListItem,
  ): GetAgentDeploymentDto => ({
    deploymentId: result.deploymentId,
    repo: result.repo,
    branch: result.branch,
    commit: result.commit,
    service: result.service,
    process: result.process,
  });
}
