import { forwardRef, Module } from '@nestjs/common'
import { OrganizationsModule } from 'src/organizations/organizations.module'
import { UsersMapper } from './user.mapper'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [forwardRef(() => OrganizationsModule)],
  controllers: [UsersController],
  providers: [UsersService, UsersMapper],
  exports: [UsersService, UsersMapper],
})
export class UsersModule {}
