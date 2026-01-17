import { forwardRef, Module } from '@nestjs/common';
import { LogtoModule } from 'src/logto/logto.module';
import { MinioModule } from 'src/minio/minio.module';
import { UsersModule } from 'src/users/users.module';
import { OrganizationsMapper } from './organization.mapper';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [
    forwardRef(() => LogtoModule),
    forwardRef(() => UsersModule),
    MinioModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationsMapper],
  exports: [OrganizationsService, OrganizationsMapper],
})
export class OrganizationsModule {}
