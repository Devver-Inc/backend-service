import { Injectable } from '@nestjs/common';
import { DocOrLean } from 'src/_utils/types';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { UsersMapper } from 'src/users/user.mapper';
import { GetProjectDto } from './_utils/dto/responses/get-project.dto';
import { GetProjectLightDto } from './_utils/dto/responses/get-project-light.dto';
import { Project, ProjectDocument } from './project.schema';

@Injectable()
export class ProjectsMapper {
  constructor(private readonly usersMapper: UsersMapper) {}

  toProjectLightDto = (project: DocOrLean<Project>): GetProjectLightDto => ({
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? null,
    createdAt: project.createdAt,
  });

  toProjectLightDtoFromArray = (
    projects: ProjectDocument[],
  ): GetProjectLightDto[] => projects.map(this.toProjectLightDto);

  toProjectDto = (
    project: ProjectDocument,
    createdByUser: LogtoUser | null,
    teamMembers: LogtoUser[],
  ): GetProjectDto => ({
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? null,
    organizationId: project.organizationId,
    createdBy: createdByUser
      ? this.usersMapper.toUserLightDto(createdByUser)
      : null,
    machineConfiguration: {
      cpuCores: project.machineConfiguration.cpuCores,
      ram: project.machineConfiguration.ram,
    },
    teamMembers: this.usersMapper.toUserLightDtoFromArray(teamMembers),
    overlayAccessControl: {
      commentPermission: project.overlayAccessControl?.commentPermission,
    },
    databaseConfigurations: (project.databaseConfigurations ?? []).map(
      (configuration) => ({
        name: configuration.name,
        type: configuration.type,
        enabled: configuration.enabled,
        username: configuration.username,
        hasPassword: Boolean(configuration.passwordEncrypted),
        replicaCount: configuration.replicaCount,
        ram: configuration.ram,
        cpuCores: configuration.cpuCores,
        storage: configuration.storage,
      }),
    ),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}
