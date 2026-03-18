import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitHubService } from './github.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [GitHubService],
  exports: [GitHubService],
})
export class GitHubModule {}
