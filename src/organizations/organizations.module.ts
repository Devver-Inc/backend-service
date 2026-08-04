import { forwardRef, Module } from '@nestjs/common';
import { LogtoModule } from 'src/logto/logto.module';
import { UsersModule } from 'src/users/users.module';
import { OrganizationsMapper } from './organization.mapper';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationsExceptions } from './_utils/errors/organizations-exceptions';

@Module({
  imports: [forwardRef(() => LogtoModule), forwardRef(() => UsersModule)],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsMapper,
    OrganizationsExceptions,
  ],
  exports: [OrganizationsService, OrganizationsMapper],
})
export class OrganizationsModule {}
