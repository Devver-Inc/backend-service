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
import {
  LogtoOrganization,
  LogtoUser,
} from 'src/logto/_utils/types/responses/responses.type';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { UsersPaginatedQueryDto } from 'src/users/_utils/dto/query/user-paginated-query.dto';
import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';
import { UserRoleEnum } from '../logto/_utils/enums/permissions.enum';
import { CreateInvitationDto } from './_utils/dto/requests/create-invitation.dto';
import { CreateOrganizationDto } from './_utils/dto/requests/create-organization.dto';
import { UpdateInvitationStatusDto } from './_utils/dto/requests/update-invitation-status.dto';
import { UpdateOrganizationDto } from './_utils/dto/requests/update-organization.dto';
import { GetInvitationDto } from './_utils/dto/responses/get-invitation.dto';
import { GetOrganizationDetailsDto } from './_utils/dto/responses/get-organization-details.dto';
import { GetOrganizationLightDto } from './_utils/dto/responses/get-organization-light.dto';
import { OrganizationsService } from './organizations.service';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import {
  LogtoOrganizationByIdPipe,
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

  @Protect()
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

  @Protect()
  @Get('invitations')
  async getOrganizationInvitations(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetInvitationDto[]> {
    return this.organizationsService.getOrganizationInvitations(user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Get(':organizationId')
  @ApiParam({ name: 'organizationId', type: String })
  @ApiOperation({ summary: 'Get Organization information' })
  getOrganizationInformations(
    @Param('organizationId', LogtoOrganizationByIdPipe)
    organization: LogtoOrganization,
  ): Promise<GetOrganizationLightDto> {
    return this.organizationsService.getOrganizationInformations(organization);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Get(':organizationId/details')
  @ApiParam({ name: 'organizationId', type: String })
  @ApiOperation({ summary: 'Get Organization details' })
  getOrganizationDetails(
    @Param('organizationId', LogtoOrganizationByIdPipe)
    organization: LogtoOrganization,
  ): Promise<GetOrganizationDetailsDto> {
    return this.organizationsService.getOrganizationDetails(organization);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Get(':organizationId/members')
  @ApiParam({ name: 'organizationId', type: String })
  @ApiOperation({ summary: 'Get Organization members' })
  @ApiResponseDecorator(GetUserLightDto)
  getOrganizationMembers(
    @Param('organizationId', LogtoOrganizationByIdPipe)
    organization: LogtoOrganization,
    @Query() paginatedQueryDto: UsersPaginatedQueryDto,
  ): Promise<PaginationDto<GetUserLightDto[]>> {
    return this.organizationsService.getOrganizationMembers(
      organization,
      paginatedQueryDto,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Patch(':organizationId')
  @FormDataRequest()
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'organizationId', type: String })
  @ApiOperation({ summary: 'Update organization' })
  async updateOrganization(
    @Param('organizationId', LogtoOrganizationByIdPipe)
    organization: LogtoOrganization,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<GetOrganizationLightDto> {
    return this.organizationsService.updateOrganization(
      organization,
      updateOrganizationDto,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete(':organizationId')
  @HttpCode(204)
  @ApiParam({ name: 'organizationId', type: String })
  @ApiOperation({ summary: 'Delete organization' })
  async deleteOrganization(
    @Param('organizationId', LogtoOrganizationByIdPipe)
    organization: LogtoOrganization,
  ): Promise<void> {
    return this.organizationsService.deleteOrganization(organization);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Put(':organizationId/owner/:newOwnerId')
  @ApiParam({ name: 'organizationId', type: String })
  @ApiParam({ name: 'newOwnerId', type: String })
  @ApiOperation({ summary: 'Transfer ownership of an organization' })
  async transferOwnership(
    @Param('organizationId', LogtoOrganizationByIdPipe)
    organization: LogtoOrganization,
    @Param('newOwnerId', LogtoUserByIdPipe) newOwner: LogtoUser,
  ) {
    return this.organizationsService.transferOwnership(organization, newOwner);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete(':organizationId/users/:userId')
  @ApiParam({ name: 'organizationId', type: String })
  @ApiParam({ name: 'userId', type: String })
  @ApiOperation({ summary: 'Remove a user from an organization' })
  async removeUserFromOrganization(
    @ConnectedUser() currentUser: LogtoUserWithOrganizations,
    @Param('organizationId', LogtoOrganizationByIdPipe)
    organization: LogtoOrganization,
    @Param('userId', LogtoUserByIdPipe) userToRemove: LogtoUser,
  ) {
    return this.organizationsService.removeUserFromOrganization(
      organization,
      currentUser,
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

  @Protect()
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
    summary: 'Get get invitation by id',
    description: 'List all pending invitations for the authenticated user',
  })
  async getInvitationById(
    @Param('invitationId', LogtoEntityByIdPipe(LogtoEntityType.INVITATION))
    invitation: LogtoInvitation,
  ): Promise<GetInvitationDto> {
    return this.organizationsService.getInvitationById(invitation);
  }

  @Protect()
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
  updateInvitationStatus(
    @ConnectedUser() user: LogtoUser,
    @Param('invitationId', LogtoInvitationByIdPipe) invitation: LogtoInvitation,
    @Body() dto: UpdateInvitationStatusDto,
  ): void {
    this.organizationsService.updateInvitationStatus(user, invitation, dto);
  }
}
