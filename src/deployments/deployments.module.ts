import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsService } from './deployments.service';
import { GitHubService } from './github.service';

@Module({
  imports: [ConfigModule],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, GitHubService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
