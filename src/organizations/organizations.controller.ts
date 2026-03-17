import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FormDataRequest } from 'nestjs-form-data';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import {
  ConnectedUser,
  ConnectedUserWithOrgs,
} from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoInvitation } from 'src/logto/_utils/types/responses/invitation.types';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { UsersPaginatedQueryDto } from 'src/users/_utils/dto/query/user-paginated-query.dto';
import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';
import { UserRoleEnum } from '../logto/_utils/enums/permissions.enum';
import { CreateInvitationDto } from './_utils/dto/requests/create-invitation.dto';
import { CreateOrganizationDto } from './_utils/dto/requests/create-organization.dto';
import { UpdateInvitationStatusDto } from './_utils/dto/requests/update-invitation-status.dto';
import { UpdateOrganizationLogoDto } from './_utils/dto/requests/update-organization-logo.dto';
import { UpdateOrganizationDto } from './_utils/dto/requests/update-organization.dto';
import { GetInvitationDto } from './_utils/dto/responses/get-invitation.dto';
import { GetOrganizationDetailsDto } from './_utils/dto/responses/get-organization-details.dto';
import { GetOrganizationLightDto } from './_utils/dto/responses/get-organization-light.dto';
import { OrganizationsService } from './organizations.service';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import {
  LogtoUserByIdPipe,
  LogtoEntityByIdPipe,
  LogtoEntityType,
  LogtoInvitationByIdPipe,
} from 'src/_utils/pipes/logto-entity-by-id.pipe';
import { ApiResponseDecorator } from 'src/_utils/decorators/api-response.decorator';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Protect({ skipOrganizationCheck: true })
  @Post()
  @FormDataRequest()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new Organization' })
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @ConnectedUser() user: LogtoUser,
  ): Promise<GetOrganizationLightDto> {
    return this.organizationsService.createOrganization(
      createOrganizationDto,
      user,
    );
  }

  @Protect({ skipOrganizationCheck: true })
  @Get('invitations')
  async getOrganizationInvitations(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetInvitationDto[]> {
    return this.organizationsService.getOrganizationInvitations(user);
  }

  @Protect({ skipOrganizationCheck: true })
  @Get('roles')
  @ApiOperation({ summary: 'Get all available organization roles' })
  getOrganizationRoles(): Promise<{ id: string; name: string }[]> {
    return this.organizationsService.getOrganizationRoles();
  }

  @Protect()
  @Get()
  @ApiOperation({ summary: 'Get current Organization information' })
  getOrganizationInformations(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetOrganizationLightDto> {
    return this.organizationsService.getOrganizationInformations(user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Get('details')
  @ApiOperation({ summary: 'Get current Organization details' })
  getOrganizationDetails(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetOrganizationDetailsDto> {
    return this.organizationsService.getOrganizationDetails(user);
  }

  @Protect()
  @Get('members')
  @ApiOperation({ summary: 'Get current Organization members' })
  @ApiResponseDecorator(GetUserLightDto)
  getOrganizationMembers(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Query() paginatedQueryDto: UsersPaginatedQueryDto,
  ): Promise<PaginationDto<GetUserLightDto[]>> {
    return this.organizationsService.getOrganizationMembers(
      user,
      paginatedQueryDto,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Patch()
  @ApiOperation({ summary: 'Update current organization' })
  async updateOrganization(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<GetOrganizationLightDto> {
    return this.organizationsService.updateOrganization(
      user,
      updateOrganizationDto,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post('logo')
  @FormDataRequest()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload current organization logo' })
  async uploadOrganizationLogo(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: UpdateOrganizationLogoDto,
  ): Promise<GetOrganizationLightDto> {
    return this.organizationsService.uploadOrganizationLogo(user, dto);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete('logo')
  @ApiOperation({ summary: 'Delete current organization logo' })
  async deleteOrganizationLogo(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetOrganizationLightDto> {
    return this.organizationsService.deleteOrganizationLogo(user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete current organization' })
  async deleteOrganization(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<void> {
    return this.organizationsService.deleteOrganization(user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Put('owner/:newOwnerId')
  @ApiParam({ name: 'newOwnerId', type: String })
  @ApiOperation({ summary: 'Transfer ownership of current organization' })
  async transferOwnership(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('newOwnerId', LogtoUserByIdPipe) newOwner: LogtoUser,
  ) {
    return this.organizationsService.transferOwnership(user, newOwner);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete('users/:userId')
  @ApiParam({ name: 'userId', type: String })
  @ApiOperation({ summary: 'Remove a user from current organization' })
  async removeUserFromOrganization(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('userId', LogtoUserByIdPipe) userToRemove: LogtoUser,
  ) {
    return this.organizationsService.removeUserFromOrganization(
      user,
      userToRemove,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post('invitations')
  @ApiOperation({
    summary: 'Create a new organization invitation',
    description: 'Invite a user to join an organization by email',
  })
  async createInvitation(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() createInvitationDto: CreateInvitationDto,
  ): Promise<GetInvitationDto> {
    return this.organizationsService.createInvitation(
      user,
      createInvitationDto,
    );
  }

  @Protect({ skipOrganizationCheck: true })
  @Get('invitations/me')
  @ApiOperation({
    summary: 'Get invitations for current user',
    description: 'List all pending invitations for the authenticated user',
  })
  async getMyInvitations(
    @ConnectedUser() user: LogtoUser,
  ): Promise<GetInvitationDto[]> {
    return this.organizationsService.getUserInvitations(user);
  }

  @Get('invitations/:invitationId')
  @ApiParam({
    name: 'invitationId',
    type: String,
    description: 'Invitation ID',
  })
  @ApiOperation({
    summary: 'Get invitation by id',
    description: 'List all pending invitations for the authenticated user',
  })
  async getInvitationById(
    @Param('invitationId', LogtoEntityByIdPipe(LogtoEntityType.INVITATION))
    invitation: LogtoInvitation,
  ): Promise<GetInvitationDto> {
    return this.organizationsService.getInvitationById(invitation);
  }

  @Protect({ skipOrganizationCheck: true })
  @Patch('invitations/:invitationId/status')
  @HttpCode(204)
  @ApiParam({
    name: 'invitationId',
    type: String,
    description: 'Invitation ID',
  })
  @ApiOperation({
    summary: 'Update invitation status',
    description: 'Accept or revoke an organization invitation',
  })
  async updateInvitationStatus(
    @ConnectedUser() user: LogtoUser,
    @Param('invitationId', LogtoInvitationByIdPipe) invitation: LogtoInvitation,
    @Body() dto: UpdateInvitationStatusDto,
  ): Promise<void> {
    await this.organizationsService.updateInvitationStatus(
      user,
      invitation,
      dto,
    );
  }
}
