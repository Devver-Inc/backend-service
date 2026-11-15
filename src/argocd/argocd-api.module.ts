import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ArgoCdRequests } from './argocd.requests';
import { ArgoCdSyncService } from './argocd-sync.service';

/** Argo API calls only, so ProjectsModule can use them without importing ArgocdModule. */
@Module({
  imports: [HttpModule],
  providers: [ArgoCdRequests, ArgoCdSyncService],
  exports: [ArgoCdRequests, ArgoCdSyncService],
})
export class ArgoCdApiModule {}
