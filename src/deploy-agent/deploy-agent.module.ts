import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from 'src/projects/projects.module';
import { DeployAgentController } from './deploy-agent.controller';
import { DeployAgentMapper } from './deploy-agent.mapper';
import { DeployAgentRepository } from './deploy-agent.repository';
import { DeployAgentRequests } from './deploy-agent.requests';
import { DeployAgentService } from './deploy-agent.service';
import { Deployment, DeploymentSchema } from './schemas/deployment.schema';
import { DeployRepo, DeployRepoSchema } from './schemas/repo.schema';
import { GitAuthorizationService } from './git-authorization.service';
import { GitGatewayController } from './git-gateway.controller';
import { InternalController } from './internal.controller';
import { SshKey, SshKeySchema } from './schemas/ssh-key.schema';
import { SshKeysController } from './ssh-keys.controller';
import { SshKeysRepository } from './ssh-keys.repository';
import { SshKeysService } from './ssh-keys.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeployRepo.name, schema: DeployRepoSchema },
      { name: Deployment.name, schema: DeploymentSchema },
      { name: SshKey.name, schema: SshKeySchema },
    ]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [
    DeployAgentController,
    SshKeysController,
    GitGatewayController,
    InternalController,
  ],
  providers: [
    DeployAgentService,
    DeployAgentRepository,
    DeployAgentRequests,
    DeployAgentMapper,
    GitAuthorizationService,
    SshKeysService,
    SshKeysRepository,
  ],
  exports: [DeployAgentService],
})
export class DeployAgentModule {}
